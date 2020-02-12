#pragma once
#pragma comment(lib, "Ws2_32.lib")

#include "stdafx.h"
#include "Dependencies/HTTPRequest.hpp"

#include <string>


#include <GWCA/GWCA.h>

#include <GWCA/Constants/Constants.h>
#include <GWCA/Utilities/Hooker.h>

#include <GWCA/Context/GameContext.h>
#include <GWCA/Context/WorldContext.h>

#include <GWCA/Managers/ChatMgr.h>
#include <GWCA/Managers/PlayerMgr.h>

#include <GWCA/Packets/StoC.h>

#include <GWCA/Managers/StoCMgr.h>
#include <GWCA/Managers/MapMgr.h>

#include <thread>