if not SERVER then return end
print("LEDAr server (C) 2022 SE Maksim Pinigin")
local STEAM_ID = "STEAM_0:0:57695873"
local API_URL = "http://localhost:5656"
local is_ready = false
local player_id = 0;
local train = nil
local trainFilter = {
    --"gmod_subway_81-502",
    --"gmod_subway_81-502k",
    --"gmod_subway_em508",
    --"gmod_subway_81-540_2",
    --"gmod_subway_81-540_2k",
    --"gmod_subway_81-702",
    --"gmod_subway_81-703",
    --"gmod_subway_ezh",
    --"gmod_subway_ezh3",
    --"gmod_subway_81-710",
    "gmod_subway_81-717_freight",
    "gmod_subway_81-717_mvm",
    "gmod_subway_81-717_lvz",
    "gmod_subway_81-717_2",
    "gmod_subway_81-717_2k",
    "gmod_subway_81-7175p",
    "gmod_subway_81-717_5a",
    "gmod_subway_81-717_5k",
    "gmod_subway_81-717_6",
    --"gmod_subway_81-540",
    --"gmod_subway_81-540_8",
    --"gmod_subway_81-717_5m",
    --"gmod_subway_81-705_old",
    --"gmod_subway_81-540_1"
}
local states = {
    KVPos = 0,
    Doors = 0,
    GreenRP = 0,
    LKVD = 0,
    AnnouncerPlaying = 0,
    Speed = 0,
    ALSSpeed = 0,
    Ring = 0,
    --[[ALS = {
        OCh = 0,
        [0] = 0,
        [40] = 0,
        [60] = 0,
        [70] = 0,
        [80] = 0,
    },]]
}

local tmp_player = player.GetBySteamID(STEAM_ID)
if tmp_player ~= false then
    is_ready = true 
    player_id = tmp_player:UserID()
    print("LEDAr: Ready")
end

--[[function EncoderTimer()
    http.Fetch(API_URL .. "/api/getENCODER", function (body, size, headers, code)
        local parsed = util.JSONToTable(body)
        if parsed.status == "ok" then
            if parsed.encoder == "RIGHT" then
                if train.KV.ControllerPosition > -3 and train.KV.ControllerPosition <= 3 then
                    train.KV.ControllerPosition = train.KV.ControllerPosition-1
                end
            elseif parsed.encoder == "LEFT" then
                if train.KV.ControllerPosition >= -3 and train.KV.ControllerPosition < 3 then
                    train.KV.ControllerPosition = train.KV.ControllerPosition+1
                end
            end
        end
    end)
end]]

gameevent.Listen("player_spawn")
hook.Add("player_spawn", "LEDSpawnHandler", function (data)
    ply = Player(data.userid)
    if ply and ply:SteamID() == STEAM_ID then
        is_ready = true
        player_id = data.userid
        print("LEDAr: Ready")
    end
end)

gameevent.Listen("player_disconnect")
hook.Add("player_disconnect", "LEDDisconnectHandler", function (data)
    if data.networkid == STEAM_ID then
        is_ready = false
        print("LEDAr: Unready")
    end
end)

hook.Add("Think", "LEDThink", function ()
    if is_ready then
        if train == nil then
            if Player(player_id):InVehicle() then
                local veh = Player(player_id):GetVehicle()
                if veh ~= NULL then
                    strain = veh:GetNW2Entity("TrainEntity")
                    if strain and table.HasValue(trainFilter, strain:GetClass()) then
                        train = strain
                        --timer.Create("encoder", 0.25, 0, EncoderTimer)
                    end
                end
            end
        else
            if not Player(player_id):InVehicle() then
                train = nil
                http.Post(API_URL .. "/api/reset")
                states = {
                    KVPos = 0,
                    Doors = 0,
                    GreenRP = 0,
                    LKVD = 0,
                    AnnouncerPlaying = 0
                }
                --timer.Remove("encoder")
                print("LEDAr: Destroyed.")
            else
                if states.KVPos ~= train.KV.ControllerPosition then
                    states.KVPos = train.KV.ControllerPosition
                    --print("KV: " .. states.KVPos)
                end
                if states.Doors ~= train.Panel.DoorsW then
                    states.Doors = train.Panel.DoorsW
                    --print("Doors: " .. states.Doors)
                    http.Post(API_URL .. "/api/setLED/1/" .. states.Doors)
                end
                if states.GreenRP ~= train.Panel.GreenRP then
                    states.GreenRP = train.Panel.GreenRP
                    http.Post(API_URL .. "/api/setLED/2/" .. states.GreenRP)
                end
                if states.LKVD ~= train.Panel.LKVD then
                    states.LKVD = train.Panel.LKVD
                    http.Post(API_URL .. "/api/setLED/0/" .. states.LKVD)
                end
                if states.AnnouncerPlaying ~= train.Panel.AnnouncerPlaying then
                    states.AnnouncerPlaying = train.Panel.AnnouncerPlaying
                    http.Post(API_URL .. "/api/setLED/3/" .. states.AnnouncerPlaying)
                end
                if states.Speed ~= math.Round(train.ALSCoil.Speed) then
                    states.Speed = math.Round(train.ALSCoil.Speed)
                    http.Post(API_URL .. "/api/setLCD", {
                        text = tostring(states.Speed) .. " Km/h",
                        secondText = ""
                    })
                end
                if states.Ring ~= train.Panel.Ring then
                    states.Ring = train.Panel.Ring
                    if states.Ring == 1 then
                        http.Post(API_URL .. "/api/setBUZZ", {
                            freq = 2500
                        })
                    elseif states.Ring == 0 then
                        http.Post(API_URL .. "/api/resetBUZZ")
                    end
                end
            end
        end
    end
end)
