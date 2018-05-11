module.exports = function(io){

    const socket = io('http://localhost:3030', { // Shards server
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
                socket.emit('device_connected', { 
                    data: { 
                        type: 'Connected', 
                        tool: toolSettings.tool_name,
                        date_time: new Date()
                    }
                });
            }
        });

            const parser = port.pipe(new ByteLength({ length: 4 })); // Piping data from PLC, plc sends 4 byte data [STX] 2 3 [ETX].
        
            parser.on('data', function(data){ // Parse data from the port.

                let rawData = data.toString();
                let rawDataRefined = rawData.slice(1, 3);
            
                let signalFromLoader = [];
                let signalFromUnloader = [];
                
                /**
                 *  ===== PLC to SerialPort data param =====
                 * 
                 *  L0 -- param from Loader sensor
                 *  U1 -- param from Unloader sensor
                 * 
                 */
            
                if(rawDataRefined == 'L0'){ // If data signal is from the Loader,
                    signalFromLoader.push({
                        date_time: new Date(),
                        tool_time: toolSettings.tool_name,
                        param: rawDataRefined,
                        position: 'LOADER',
                        value: 1
                    });

                    socket.emit('device_data', signalFromLoader); // Send sinalFromLoader object to Shards Server.

                } else if (rawDataRefined == 'U1'){ // Else if data signal is from the Unloader,
                    signalFromUnloader.push({
                        date_time: new Date(),
                        tool_time: toolSettings.tool_name,
                        param: rawDataRefined,
                        position: 'UNLOADER',
                        value: 1
                    });
                    
                    socket.emit('device_data', signalFromUnloader); // Send sinalFromUnloader object to Shards Server.
                }
            
            });

        port.on('close', function(){ // port event listener when disconnected invoke reconenct
            console.log('Disconnected. Trying to reconnect...');
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