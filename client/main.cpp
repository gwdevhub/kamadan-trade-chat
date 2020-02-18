#include "main.h"

#define SERVER_HOST "18.202.80.59"

struct TradeMessage {
    time_t    timestamp = 0;
    std::string name;
    std::string message;
    inline bool contains(std::string search) {
        auto it = std::search(
            message.begin(), message.end(),
            search.begin(), search.end(),
            [](char ch1, char ch2) { return std::toupper(ch1) == std::toupper(ch2); }
        );
        return (it != message.end());
    };
};

static volatile bool running;
// Hook entries
GW::HookEntry HookEntry_MessageLocal;
GW::HookEntry HookEntry_MapLoaded;
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
            char url[64];
            snprintf(url,64,"http://%s/add", SERVER_HOST);
            while (running) {
                Sleep(100);
                if (to_send.empty())
                    continue;
                auto m = to_send.front();
                to_send.pop();
                if (!m) continue;
                printf("Sending trade message to server... ");
                try {
                    // you can pass http::InternetProtocol::V6 to Request to make an IPv6 request
                    http::Request request(url);

                    // pass parameters as a map
                    std::map<std::string, std::string> parameters = {
                        {"timestamp", std::to_string(m->timestamp)},
                        {"sender", m->name},
                        {"message",m->message}
                    };
                    const http::Response response = request.send("POST", parameters, {
                        "Content-Type: application/x-www-form-urlencoded"
                        });
                    printf("success\n");
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
            int size_needed = WideCharToMultiByte(CP_UTF8, 0, &message[0], (int)message.size(), NULL, 0, NULL, NULL);
            m->message = std::string(size_needed, 0);
            WideCharToMultiByte(CP_UTF8, 0, &message[0], (int)message.size(), &m->message[0], size_needed, NULL, NULL);

            size_needed = WideCharToMultiByte(CP_UTF8, 0, &player_name[0], (int)player_name.size(), NULL, 0, NULL, NULL);
            m->name = std::string(size_needed, 0);
            WideCharToMultiByte(CP_UTF8, 0, &player_name[0], (int)player_name.size(), &m->name[0], size_needed, NULL, NULL);

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
