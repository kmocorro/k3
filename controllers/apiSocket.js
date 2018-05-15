const uuidv1 = require('uuid/v1');
const moment = require('moment');

module.exports = function(io){

    const socket = io('http://localhost:3030', { // Connect to Shards server
        path: '/socketserver'
    });

    let toolSettings = { // Change this for every device.
        tool_name: 'NTM17',
    }

    /**
     * Initialize connection to serial port
     */
    function connectSerial(){
        let SerialPort = require('serialport');
        let ByteLength = SerialPort.parsers.ByteLength;

        let port = new SerialPort('COM6', { // PORT path depends on the device.
            baudRate: 9600, 
            parity : 'none',
            stopBits: 1,
            flowControl : false
            },
            function(err){
            if(err){
                console.log('COM path is undefined. Trying to reconnect...');
                re_connectSerial();
            } else {
                console.log('Device connected.');
                socket.emit('device_connected', { 
                    data: { 
                        type: 'Connected', 
                        tool: toolSettings.tool_name,
                        date_time: moment(new Date()).format()
                    }
                });
            }
        });

        
            let isLoaderCount = 0;
            let isUnloaderCount = 0;
        
            const parser = port.pipe(new ByteLength({ length: 4 })); // Piping data from PLC, plc sends 4 byte data [STX] 2 3 [ETX].
        
            parser.on('data', function(data){ // Parse data from the port.
                //console.log(data);
                if(data){

                    let rawData = data.toString();
                    let rawDataRefined = rawData.slice(1, 3);
                    
                    /**
                     *  ===== PLC to SerialPort data param =====
                     * 
                     *  L0 -- param from Loader sensor
                     *  U1 -- param from Unloader sensor
                     * 
                     */

                    if(rawDataRefined == 'L0'){ // If data signal is from the Loader,

                        isLoaderCount = isLoaderCount + 1;
                        console.log('Loader: ', isLoaderCount);
                        if(isLoaderCount == 50){
                            console.log('Loader sending input to server...');
                            let signalFromLoader = {
                                data_uuid: uuidv1(),
                                date_time: moment(new Date()).format(),
                                tool_id: toolSettings.tool_name,
                                param: rawDataRefined,
                                position: 'LOADER',
                                value: 50
                            }

                            socket.emit('device_data', signalFromLoader); // Send sinalFromLoader object to Shards Server.
                            isLoaderCount = 0;
                        }
                        
                    } else if (rawDataRefined == 'U1'){ // Else if data signal is from the Unloader,

                        isUnloaderCount = isUnloaderCount + 1;

                        console.log('Unloader: ', isUnloaderCount);
                        if(isUnloaderCount == 50){
                            
                            console.log('Unloader sending outs to server...');
                            let signalFromUnloader = {
                                data_uuid: uuidv1(),
                                date_time: moment(new Date()).format(),
                                tool_id: toolSettings.tool_name,
                                param: rawDataRefined,
                                position: 'UNLOADER',
                                value: 50
                            }

                            socket.emit('device_data', signalFromUnloader); // Send sinalFromUnloader object to Shards Server.
                            isUnloaderCount = 0;
                        }
                        
                    }

                }

            });

        port.on('close', function(){ // port event listener when disconnected invoke reconenct
            console.log('Device disconnected. Trying to reconnect...');
            socket.emit('device_disconnected', { 
                data: { 
                    type: 'Disconnected', 
                    tool: toolSettings.tool_name,
                    date_time: new Date()
                }
            });

            re_connectSerial();
        });
            
        port.on('error', function(err){ // port event listener when disconnected invoke reconenct
            console.log(err.message);
            console.log('Error occured. Trying to reconnect...');
            re_connectSerial();
        });
    }

    /**
     * Reconnect to Serial every 2 secs.
     */
    function re_connectSerial(){  
        setTimeout(function(){
            connectSerial();
        }, 2000);
    }

    // Invoke.
    connectSerial();
}