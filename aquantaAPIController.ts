import {add, format} from 'date-fns';
import axios from 'axios';
import {AQUANTA_GOOGLE_KEY} from './settings';

const AquantaClient = axios.create({
    baseURL: 'https://portal.aquanta.io/',
    timeout: 3000,
});
const GoogleClient = axios.create({
    baseURL: 'https://www.googleapis.com/',
    timeout: 3000,
});

export class AquantaAPIController {
    private aquantaToken?;
    private config;
    private activeLocation;
    private devices = {};

    constructor(config) {
        this.config = config;
        this.updateData([]);
    }

    public getTemperature(deviceID) {
        return this.devices[deviceID].tempValue;
    }

    public getBoostActive(deviceID) {
        return this.devices[deviceID].boost;
    }

    public getAwayActive(deviceID) {
        return this.devices[deviceID].away;
    }

    public getDevices() {
        return this.devices;
    }

    async updateData(deviceIDs : [string] | [] = []) {
        try {
            if(deviceIDs.length === 0){
                //get all device statuses by default
                const aquantaData = await this.getAquantaData();
                this.activeLocation = aquantaData.selectedDeviceId as string
                this.devices[aquantaData.deviceId as string]={
                    id: aquantaData.deviceId,
                    dsn: aquantaData.device,
                    name: aquantaData.userDescription,
                    boost: aquantaData.boostRunning,
                    boost_start: aquantaData.boost_start,
                    boost_end: aquantaData.boost_end,
                    boostDuration: aquantaData.boost_duration,
                    away: aquantaData.awayRunning,
                    away_start: aquantaData.away_start,
                    away_end: aquantaData.away_end,
                    tempValue: aquantaData.tempValue,
                    hw_avail_fraction : aquantaData.hw_avail_fraction
                };

                for (const location in aquantaData.locations){
                    if(location !== aquantaData.selectedDeviceId){
                        const waterHeaterData = await this.getAquantaData(location as string);
                        this.devices[location] = {
                            id: waterHeaterData.deviceId,
                            dsn: waterHeaterData.device,
                            name: waterHeaterData.userDescription,
                            boost: waterHeaterData.boostRunning,
                            boost_start: waterHeaterData.boost_start,
                            boost_end: waterHeaterData.boost_end,
                            boostDuration: waterHeaterData.boost_duration,
                            away: waterHeaterData.awayRunning,
                            away_start: waterHeaterData.away_start,
                            away_end: waterHeaterData.away_end,
                            tempValue: waterHeaterData.tempValue,
                            hw_avail_fraction : waterHeaterData.hw_avail_fraction
                        };
                    }
                }
            }
            else {
                for(let i=0; i < deviceIDs.length; i++){
                    const aquantaData = await this.getAquantaData(deviceIDs[i] as string);
                    this.activeLocation = aquantaData.selectedDeviceId
                    // @ts-ignore
                    this.devices[deviceIDs[i] as string]={
                        id: aquantaData.deviceId,
                        dsn: aquantaData.device,
                        name: aquantaData.userDescription,
                        boost: aquantaData.boostRunning,
                        boost_start: aquantaData.boost_start,
                        boost_end: aquantaData.boost_end,
                        boostDuration: aquantaData.boost_duration,
                        away: aquantaData.awayRunning,
                        away_start: aquantaData.away_start,
                        away_end: aquantaData.away_end,
                        tempValue: aquantaData.tempValue,
                        hw_avail_fraction : aquantaData.hw_avail_fraction
                    };
                }
            }

        } catch(error: unknown) {
            if (error instanceof Error) {
                return {
                    message: `Error calling Aquanta API: ${error.message}`,
                };
            }
        }
    }

    async getAquantaData(deviceID : string|null = null) {
        if ( !this.aquantaToken ) {
            await this.authenticateUser(
                this.config.aquantaKey || AQUANTA_GOOGLE_KEY,
                this.config.email,
                this.config.password);
        }
        if(deviceID && deviceID.length){
            if(this.activeLocation !== deviceID){
                await this.selectLocation(deviceID)
            }
        }
        let aquantaData = await this.callAquantaDataAPI();
        if ( !aquantaData ) {
            console.log('Aquanta Token Expired.  Attempting to reauthenticate.');
            const token = await this.callAquantaDataAPI();
            if ( !token ) {
                console.log('Aquanta Token Expired.  Could not reauthenticate');
            } else {
                aquantaData = this.getAquantaData();
            }
        }

        return aquantaData;
    }

    async authenticateUser(aquantaGoogleKey: string, email: string, password: string) {
        const googleLoginRes = await GoogleClient.post(`identitytoolkit/v3/relyingparty/verifyPassword?key=${aquantaGoogleKey}`,
            {'email':email, 'password':password, 'returnSecureToken':true});
        console.debug(`Retrieved Google ID Token: ${googleLoginRes.data.idToken}`);

        const aquantaToken = await AquantaClient.post('portal/login',
            {'idToken':googleLoginRes.data.idToken, 'remember':true},
            {
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                },
                withCredentials: true,
            })
            .then(res => {
                const cookieArray = res.headers['set-cookie'];
                const authCookie = cookieArray ? cookieArray[0] : null;
                if ( authCookie ) {
                    const cookieTextSplit = authCookie.split(';', 1);
                    const authTokenSplit = cookieTextSplit[0].split('=');
                    return authTokenSplit[1];
                } else {
                    throw new Error(`Error Authenticating.  Could not parse cookie: ${cookieArray}`);
                }
            });

        console.debug(`Retrieved Aquanta Token: ${aquantaToken}`);
        this.aquantaToken = aquantaToken;
        return aquantaToken;
    }

    async callAquantaDataAPI() {
        AquantaClient.defaults.headers['Cookie'] = `aquanta-prod=${this.aquantaToken}`;
        return await AquantaClient.get('portal/get', {timeout: 1500, validateStatus: () => true})
            .then(res => {
                if ( res.status === 200 ) {
                    return res.data;
                } else if ( res.status === 401 ) {
                    this.aquantaToken = null;
                    return null;
                } else {
                    throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
                }
            })
            .catch(err => {
                throw new Error(`Error calling Aquanta API: ${err.message}`);
            });
    }

    async turnOffAway (deviceID) {
        if(this.activeLocation !== deviceID){
            await this.selectLocation(deviceID)
        }
        return await AquantaClient.put('portal/set/schedule/away/off', {}, {validateStatus: () => true})
            .then(res => {
                if ( res.status !== 200 ) {
                    throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
                }
                this.devices[this.activeLocation].away = false;
            })
            .catch(err => {
                throw new Error(`Error calling Aquanta API: ${err.message}`);
            });
    }

    async turnOnAway (deviceID) {
        if(this.activeLocation !== deviceID){
            await this.selectLocation(deviceID)
        }
        const start_date = new Date();
        const stop_date = add(start_date, {hours: 336});
        const away_format = 'yyyy-MM-dd\'T\'HH:mm:ssxxxxx';

        const data = {
            start: format(start_date, away_format),
            stop: format(stop_date, away_format),
            mode: 'now',
        };
        console.debug(`Away Mode Activate Return: ${JSON.stringify(data)}`);


        return await AquantaClient.put('portal/set/schedule/away', data, {timeout: 5000, validateStatus: () => true})
            .then(res => {
                if ( res.status !== 200 ) {
                    throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
                }
                this.devices[this.activeLocation].away = true;
            })
            .catch(err => {
                throw new Error(`Error calling Aquanta API: ${err.message}`);
            });
    }

    async turnOffBoost (deviceID) {
        if(this.activeLocation !== deviceID){
            await this.selectLocation(deviceID)
        }
        return await AquantaClient.put('portal/set/schedule/boost/off', {}, {validateStatus: () => true})
            .then(res => {
                if ( res.status !== 200 ) {
                    throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
                }
                this.devices[this.activeLocation].boost = false;
            })
            .catch(err => {
                throw new Error(`Error calling Aquanta API: ${err.message}`);
            });
    }

    async selectLocation(locationID: string){
        if ( !this.aquantaToken ) {
            await this.authenticateUser(
                this.config.aquantaKey || AQUANTA_GOOGLE_KEY,
                this.config.email,
                this.config.password);
        }
        AquantaClient.defaults.headers['Cookie'] = `aquanta-prod=${this.aquantaToken}`;
        return await AquantaClient.put(`portal/set/selected_location?locationId=${locationID}`, null, {timeout: 5000, validateStatus: () => true})
            .then(res => {
                if ( res.status === 200 ) {
                    this.activeLocation = locationID;
                    return;
                }
                else if (res.status === 401) {
                    this.aquantaToken = null;
                    return null;
                }
                else{
                    throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
                }

            })
            .catch(err => {
                throw new Error(`Error calling Aquanta API: ${err.message}`);
            });
    }

    async turnOnBoost (deviceID) {
        if(this.activeLocation !== deviceID){
            await this.selectLocation(deviceID)
        }
        const start_date = new Date();
        let dateDelta;
        if (this.devices[this.activeLocation].boostDuration < 1 ) {
            dateDelta = {minutes: this.devices[this.activeLocation].boostDuration * 60};
        } else {
            dateDelta = {hours: this.devices[this.activeLocation].boostDuration};
        }
        const stop_date = add(start_date, dateDelta);
        const boost_format = 'yyyy-MM-dd\'T\'HH:mm:ssxxxxx';

        const data = {
            start: format(start_date, boost_format),
            stop: format(stop_date, boost_format),
            prompt_for_boost: true,
            mode: 'now',
        };
        console.debug(`Boost Mode Activate Return: ${JSON.stringify(data)}`);

        return await AquantaClient.put('portal/set/schedule/boost', data, {timeout: 5000, validateStatus: () => true})
            .then(res => {
                if ( res.status !== 200 ) {
                    throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
                }
                this.devices[this.activeLocation].boost = true;
            })
            .catch(err => {
                throw new Error(`Error calling Aquanta API: ${err.message}`);
            });
    }

}