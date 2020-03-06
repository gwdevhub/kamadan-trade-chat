#include "main.h"

//#define SERVER_HOST "18.202.80.59"
#define SERVER_HOST "local.kamadan.com"

struct TradeMessage {
    time_t    timestamp = 0;
    char name[80];
    char message[512];
    uint32_t channel = 0;
    inline void setSender(const wchar_t* _sender) {
        #pragma warning(suppress : 4996)
        int sender_length = wcstombs(name, _sender, sizeof(name));
        if (sender_length == 0xffffffff)
            throw "Failed to call wcstombs on sender";
        name[sender_length] = 0;
    }
    inline void setMessage(const wchar_t* _message) {
        #pragma warning(suppress : 4996)
        int message_length = wcstombs(message, _message, sizeof(message));
        if (message_length == 0xffffffff)
            throw "Failed to call wcstombs on message";
        message[message_length] = 0;
        // Trim any trailing 0x1 chars.
        for (size_t i = message_length - 1; i != 0; i--) {
            if (message[i] != 0 && message[i] != 1)
                break;
            message[i] = 0;
        }
    }
};

static volatile bool running;
// Hook entries
GW::HookEntry HookEntry_MessageLocal;
GW::HookEntry HookEntry_MapLoaded;
GW::HookEntry HookEntry_WhisperReceived;
static std::thread MessageSender;
static std::queue<TradeMessage*> to_send;
static FILE* stdout_proxy = nullptr;
static FILE* stderr_proxy = nullptr;
namespace {
    static bool GetInKamadanAE1() {
        using namespace GW::Constants;
        switch (GW::Map::GetMapID()) {
        case MapID::Kamadan_Jewel_of_Istan_outpost:
        case MapID::Kamadan_Jewel_of_Istan_Halloween_outpost:
        case MapID::Kamadan_Jewel_of_Istan_Wintersday_outpost:
        case MapID::Kamadan_Jewel_of_Istan_Canthan_New_Year_outpost:
            break;
        default:
            return false;
        }
        return 	GW::Map::GetDistrict() == 1 && GW::Map::GetRegion() == GW::Constants::Region::America;
    }
    static void CheckOutpost() {
        if (!GW::Map::GetIsMapLoaded() || GetInKamadanAE1())
            return;
        GW::Map::Travel(GW::Constants::MapID::Kamadan_Jewel_of_Istan_outpost, GW::Constants::District::American, 1);
    }
    static void Init() {
        static bool initted = false;
        if (initted) return;
        setlocale(LC_ALL, "en_US.UTF-8");
        initted = true;
        #ifdef _DEBUG
                AllocConsole();
                SetConsoleTitle(L"kamadan-trade-chat Console");
                freopen_s(&stdout_proxy, "CONOUT$", "w", stdout);
                freopen_s(&stderr_proxy, "CONOUT$", "w", stderr);
        #else
        #if 0
                // If you replace the above "#if 0" by "#if 1", you will log
                // the stdout in "log.txt" which will be in your "Gw.exe" folder.
                freopen_s(&stdout_proxy, "log.txt", "w", stdout);
        #endif
        #endif

        MessageSender = std::thread([]() {
            char trade_url[64];
            snprintf(trade_url,64,"http://%s/add", SERVER_HOST);
            char whisper_url[64];
            snprintf(whisper_url, 64, "http://%s/whisper", SERVER_HOST);
            while (running) {
                Sleep(100);
                if (to_send.empty())
                    continue;
                auto m = to_send.front();
                to_send.pop();
                if (!m) continue;
                
                try {
                    // you can pass http::InternetProtocol::V6 to Request to make an IPv6 request
                    char* url = nullptr;
                    switch (m->channel) {
                        case static_cast<uint32_t>(GW::Chat::Channel::CHANNEL_TRADE) :
                            url = &trade_url[0];
                            break;
                        case static_cast<uint32_t>(GW::Chat::Channel::CHANNEL_WHISPER) :
                            url = &whisper_url[0];
                            break;
                    }
                    if (url) {
                        printf("Sending trade message to %s:\n%s ",url,m->message);
                        http::Request request(url);

                        // pass parameters as a map
                        std::map<std::string, std::string> parameters = {
                            {"t", std::to_string(m->timestamp)},
                            {"s", m->name},
                            {"m",m->message}
                        };
                        const http::Response response = request.send("POST", parameters, {
                            "Content-Type: application/x-www-form-urlencoded"
                            });
                        printf("success\n");
                    }
                    //std::cout << std::string(response.body.begin(), response.body.end()) << '\n'; // print the result
                }
                catch (const std::exception & e)
                {
                    std::cerr << "Request failed, error: " << e.what() << '\n';
                }
                delete m;
            }
            while (!to_send.empty()) {
                auto m = to_send.front();
                to_send.pop();
                delete m;
            }
            });
        // Map to kamadan ae1
        GW::Chat::CreateCommand(L"exit", [](const wchar_t*, int, wchar_t**) {
            running = false;
            });
        // Map to kamadan ae1
        GW::StoC::RegisterPacketCallback<GW::Packet::StoC::MapLoaded>(&HookEntry_MapLoaded, [](GW::HookStatus*, GW::Packet::StoC::MapLoaded* pak) {
            CheckOutpost();
            });
        GW::Chat::RegisterWhisperCallback(&HookEntry_WhisperReceived, [](GW::HookStatus*, wchar_t* sender, wchar_t* message) {
            TradeMessage* m = new TradeMessage();
            m->channel = static_cast<uint32_t>(GW::Chat::Channel::CHANNEL_WHISPER);
            m->setSender(sender);
            m->setMessage(message);

            to_send.push(m);
            });
        // Trade message received
        GW::StoC::RegisterPacketCallback<GW::Packet::StoC::MessageLocal>(&HookEntry_MessageLocal, [](GW::HookStatus*, GW::Packet::StoC::MessageLocal* pak) {
            if (pak->channel != GW::Chat::CHANNEL_TRADE)
                return;
            if (!GetInKamadanAE1())
                return;
            printf("Trade message received\n");
            GW::Array<wchar_t>* buff = &GW::GameContext::instance()->world->message_buff;
            if (!buff->m_buffer || buff->m_size < 5)
                return; // No message, may have been cleared by another hook.
            TradeMessage* m = new TradeMessage();
            m->timestamp = time(nullptr); // This could be better
            // wchar_t* from message buffer to Message.message
            std::wstring message;
            if (buff->m_buffer[0] == 0x108) {
                // Trade chat message (not party search window)
                message = std::wstring(&buff->m_buffer[2]);
            }
            else {
                // Trade chat message (via party search window)
                message = std::wstring(&buff->m_buffer[3]);
            }
            if (message.size() < 2) {
                delete m;
                return;
            }
            message = message.substr(0, message.size() - 1);
            if (message.empty()) {
                delete m;
                return;
            }
            std::wstring player_name(GW::PlayerMgr::GetPlayerName(pak->player_number));
            if (player_name.empty()) {
                delete m;
                return;
            }
            m->channel = pak->channel;
            m->setSender(player_name.c_str());
            m->setMessage(message.c_str());

            to_send.push(m);

            });
        CheckOutpost();
        printf("Initialised\n");
    }
    static void Destroy() {
        GW::DisableHooks();
        if(MessageSender.joinable())
            MessageSender.join();

        if (stdout_proxy)
            fclose(stdout_proxy);
        if (stderr_proxy)
            fclose(stderr_proxy);
        FreeConsole();
    }

}

static DWORD WINAPI ThreadProc(LPVOID lpModule)
{
    // This is a new thread so you should only initialize GWCA and setup the hook on the game thread.
    // When the game thread hook is setup (i.e. SetRenderCallback), you should do the next operations
    // on the game from within the game thread.

    HMODULE hModule = static_cast<HMODULE>(lpModule);

    GW::Initialize();

    running = true;

    ::Init();
    while (running) {
        Sleep(100);
    }
    ::Destroy();
    // Hooks are disable from Guild Wars thread (safely), so we just make sure we exit the last hooks
    while (GW::HookBase::GetInHookCount())
        Sleep(16);

    

    // We can't guarantee that the code in Guild Wars thread isn't still in the trampoline, but
    // practically a short sleep is fine.
    Sleep(16);
    GW::Terminate();
    
    FreeLibraryAndExitThread(hModule, EXIT_SUCCESS);
}

BOOL WINAPI DllMain(HMODULE hModule, DWORD dwReason, LPVOID lpReserved)
{
    DisableThreadLibraryCalls(hModule);

    if (dwReason == DLL_PROCESS_ATTACH) {
        HANDLE handle = CreateThread(0, 0, ThreadProc, hModule, 0, 0);
        CloseHandle(handle);
    }

    return TRUE;
}
