let express = require('express');
let app = express();
let server = process.env.PORT || 5050;

function connectRS232(){
    let SerialPort = require('serialport');
    let ByteLength = SerialPort.parsers.ByteLength;

    let port = new SerialPort('COM4', {
        baudRate: 9600, 
        parity : 'none',
        stopBits: 1,
        flowControl : false
        },
        function(err){
        if(err){
            console.log('COM path is undefined. Trying to reconnect...');
            reconnectRS232();
        } else {
            console.log('Connected.');
        }
    });

    const parser = port.pipe(new ByteLength({ length: 4 }));
    
    parser.on('data', function(data){
        let unloaderData = data.toString();
        let unloaderRefined = unloaderData.slice(1, 3);
    
        let gg = [];
    
        if(unloaderRefined == 'L0'){
            gg.push({
                date_time: new Date(),
                tool_time: 'NTM17',
                param: unloaderRefined,
                position: 'UNLOADER',
                value: 1
            });
        }
    
        console.log(JSON.stringify(gg));
    
    });
    
    port.on('close', function(){
        console.log('Disconnected. Trying to reconnect...');
        reconnectRS232();
    });
    
    port.on('error', function(err){
        console.log(err.message);
        console.log('Error occured. Trying to reconnect...');
        reconnectRS232();
    }); 

}

function reconnectRS232(){

    setTimeout(function(){
        connectRS232();
    }, 2000);
    
}

connectRS232();

app.listen(server);