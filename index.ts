import { lambda, DiscoveryRequest, DiscoveryResponse, CommandRequest, CommandResponse, StateRefreshResponse, StateUpdateRequest, DeviceErrorTypes } from "st-schema"
import {AQUANTA_CREDENTIALS} from "./settings";
import {AquantaAPIController} from "./aquantaAPIController";
const AquantaAPI = new AquantaAPIController(AQUANTA_CREDENTIALS);


async function discoveryRequest(request : any, response : DiscoveryResponse) {
  console.log('discoveryRequest');
  console.log(JSON.stringify(request));
  const results = await AquantaAPI.getAquantaData();
  for (const key in results.locations) {
    const value = results.locations[key];
    const device = response.addDevice(key, value.name, 'd0988ec3-8629-4cdb-9ec9-e9d63fcfa0ea');
    device.manufacturerName("Aquanta").modelName("Water Heater Controller");
  }
}

async function commandRequest(request: any, response : CommandResponse) {
  console.log('CommandRequest');
  console.log(JSON.stringify(request));
  for(let i=0; i<request.devices.length;i++){
    const device = request.devices[i];
    const deviceResponse = response.addDevice(device.externalDeviceId);
    for (const cmd of device.commands) {
      if (cmd.capability === 'chapterstreet47138.waterHeaterStatus' && cmd.command === 'setStatus') {
        if(cmd.arguments[0] === 'away'){
          await AquantaAPI.turnOnAway(device.externalDeviceId)
        }
        else {
          await AquantaAPI.turnOffAway(device.externalDeviceId)
        }
      } else if (cmd.capability === 'chapterstreet47138.waterHeaterStatus' && cmd.command === 'setBoost') {
        if(cmd.arguments[0] === 'on'){
          await AquantaAPI.turnOnBoost(device.externalDeviceId)
        }
        else {
          await AquantaAPI.turnOffBoost(device.externalDeviceId)
        }
      } else {
        deviceResponse.setError(
            `Command '${cmd.command} of capability '${cmd.capability}' not supported`,
            DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED)
      }
    }
    // full state update
    await AquantaAPI.updateData([device.externalDeviceId]);
    const devices = AquantaAPI.getDevices();
    deviceResponse.addState('main', 'st.healthCheck', 'healthStatus', 'online')
    deviceResponse.addState('main', 'st.healthCheck', 'checkInterval', 60)
    deviceResponse.addState('main', 'chapterstreet47138.waterHeaterStatus', 'status', devices[device.externalDeviceId].away ? 'away' : 'normal')
    deviceResponse.addState('main', 'chapterstreet47138.waterHeaterStatus', 'boosted', devices[device.externalDeviceId].boost ? "on": "off")
    deviceResponse.addState('main', 'chapterstreet47138.waterHeaterStatus', 'level', Math.round(devices[device.externalDeviceId].hw_avail_fraction * 100), '%')
    deviceResponse.addState('main', 'chapterstreet47138.waterHeaterStatus', 'temperature', Math.round((devices[device.externalDeviceId].tempValue * 1.8) + 32), 'F')
    // deviceResponse.addState('main', 'st.powerConsumptionReport', 'powerConsumption', {
    //   energy: 10,
    //   start: '',
    //   end: '',
    // });
  }
}

async function stateRefreshRequest(request: any, response: StateRefreshResponse) {
  console.log('StateUpdateRequest');
  console.log(JSON.stringify(request));
  const deviceIds = request.devices.map((dev) => dev.externalDeviceId)
  await AquantaAPI.updateData(deviceIds);
  const devices = AquantaAPI.getDevices();
  console.log('Devices : ' + JSON.stringify(devices));
  for (let i=0; i < deviceIds.length; i++) {
    const currentDeviceResp = response.addDevice(deviceIds[i]);
    if (Object.prototype.hasOwnProperty.call(devices, deviceIds[i])) {
      const device = devices[deviceIds[i]];
      currentDeviceResp.addState('main', 'st.healthCheck', 'healthStatus', 'online')
      currentDeviceResp.addState('main', 'st.healthCheck', 'checkInterval', 60, 's')
      currentDeviceResp.addState('main', 'chapterstreet47138.waterHeaterStatus', 'status', device.away ? 'away' : 'normal')
      currentDeviceResp.addState('main', 'chapterstreet47138.waterHeaterStatus', 'boosted', device.boost ? "on": "off")
      currentDeviceResp.addState('main', 'chapterstreet47138.waterHeaterStatus', 'level', Math.round(device.hw_avail_fraction * 100), '%')
      currentDeviceResp.addState('main', 'chapterstreet47138.waterHeaterStatus', 'temperature', Math.round((device.tempValue * 1.8) + 32), 'F')
      // currentDeviceResp.addState('main', 'st.powerConsumptionReport', 'powerConsumption', {
      //   energy: 10,
      //   start: '',
      //   end: '',
      // });
    }
    else {
      currentDeviceResp.addState('main', 'st.healthCheck', 'healthStatus', 'offline')
      currentDeviceResp.addState('main', 'st.healthCheck', 'checkInterval', 60, 's')

      // currentDeviceResp.setError(
      //     `Device '${deviceIds[i]} is either Unavailable or Aquanta is down. Please try again later`,
      //     DeviceErrorTypes.DEVICE_UNAVAILABLE)
    }
  }
}


module.exports.handler = lambda({
  discoveryRequest,
  commandRequest,
  stateRefreshRequest
});

