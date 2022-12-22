import * as dotenv from 'dotenv';
import { default as request } from 'request';
const debug = process.env.devdebug || false
dotenv.config();

export class sendrequest {
    async send(sendID) {


        const options = {
            url: debug ? process.env.debug : process.env.live,
            headers: {
                'X-AIO-Key': process.env.ADAFRUIT_IO_KEY,
                'Content-Type': 'application/json',
            },
            formData :{
                'value': sendID
            }
        };
        
        request.post(options, (err, res, body) => {
            if (err || res.statusCode >= 500) {
                throw 'error sending MQTT';
            }
            
            const bodyobj = JSON.parse(body);
            if (bodyobj.created_at){
                return {responsecode : 200, responsedata : bodyobj, errormsg: ''}
            }
            else
                return {responsecode : 404, responsedata : null, errormsg: 'error publishing MQTT'}
        });
        
    }

}
