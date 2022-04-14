const fs = require("fs");
const express = require("express");
const { SerialPort } = require("serialport");
const port = 5656;
const com_port = fs.readFileSync("com_port.txt", "utf8");
console.log("Using COM port: " + com_port)
var serial_ready = false;
var leds_count = 0;
var api_version = 0;
var encoder_state = "NOTHING";
//var encoder_timer = {};
//var encoder_timer_int = 0;
var enc_timer;
const serial = new SerialPort({
    path: com_port,
    baudRate: 250000
});


const app = express();
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

var buffer = "";
serial.on('readable', () => {
	while (true) {
		let data = serial.read(1);
		if (data === null) break;
		buffer += data.toString();
		if(data.toString() === '\n') {
			var params = buffer.split(';');
			switch(params[0]) {
				case "READY":
					console.log("LEDAr Device ready.");
					serial_ready = true;
					serial.write("COUNT;\n");
					break;
				case "COUNT":
					console.log("LEDs count: " + params[1]);
					leds_count = Number(params[1]);
					serial.write("VERSION;\n");
					break;
				case "VERSION":
					console.log("Firmware version: " + params[1]);
					serial.write("MODEL;\n");
					serial.write("LCDEX;SWSLEDAr;loaded.;\n");
					api_version = Number(params[1]);
					break;
				case "ENC":
					clearTimeout(enc_timer);
					encoder_state = params[1];
					console.log("Debug: Encoder State = " + params[1]);
					enc_timer = setTimeout(() => {
						encoder_state = "NOTHING";
					}, 3000);
					break;
				case "MODEL":
					console.log("Model name: " + params[2]);
					break;
			}
			buffer = "";
		}
	}
});

app.post('/api/setLED/:led/:state', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
    if(req.params.led < 0 || req.params.led >= leds_count) {
        res.status(404).send(JSON.stringify({
            status: "error",
            error: "object_not_exists"
        }));
        return;
    }
    if(req.params.state == 1 || req.params.state == 0) serial.write("LED;" + req.params.led + ";" + req.params.state + ";" + "\n");
    else {
        res.status(400).send(JSON.stringify({
            status: "error",
            error: "bad_state"
        }));
        return;
    }

    res.status(200).send(JSON.stringify({
        status: "ok"
    }));
});

app.post('/api/setFADE/:led/:state', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
    if(req.params.led < 0 || req.params.led >= leds_count) {
        res.status(404).send(JSON.stringify({
            status: "error",
            error: "object_not_exists"
        }));
        return;
    }
    if(req.params.state >= 0 && req.params.state < 256) serial.write("FADE;" + req.params.led + ";" + req.params.state + ";" + "\n");
    else {
        res.status(400).send(JSON.stringify({
            status: "error",
            error: "bad_state"
        }));
        return;
    }

    res.status(200).send(JSON.stringify({
        status: "ok"
    }));
});

app.get('/api/getVERSION', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
	res.send(JSON.stringify({
		status: "ok",
		version: api_version
	}));
});

/*app.get('/api/getENCODERt', (req, res) => {
	encoder_timer_int += 1;
	var i = encoder_timer_int;
	encoder_timer[i] = false;
	setTimeout(function () {
		delete encoder_timer[i];
	}, 5000);
	while (true) {
		if(encoder_state == "NOTHING" && encoder_timer[i] !== undefined) {
			continue;
		} else {
			break;
		}
		
	}
	
	res.send(JSON.stringify({
		status: "ok",
		encoder: encoder_state
	}));
	encoder_state = "NOTHING";
});*/

app.get('/api/getENCODER', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
	res.send(JSON.stringify({
		status: "ok",
		encoder: encoder_state
	}));
	encoder_state = "NOTHING";
});

app.post('/api/reset', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
	serial.write("RESET;\n");
	res.send(JSON.stringify({
		status: "ok"
	}));
});

app.post('/api/setLCD', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
	if(req.body.text !== undefined && req.body.secondText !== undefined) {
		if(req.body.text.length > 8 || req.body.secondText.length > 8) {
			res.status(413).send(JSON.stringify({
				status: "error",
				error: "bad_length"
			}));
			return;
		}
		
		serial.write("LCDEX;" + req.body.text + ";" + req.body.secondText + ";\n");
		res.send(JSON.stringify({
			status: "ok",
			text: {
				first: req.body.text,
				second: req.body.secondText
			}
		}));
	} else {
		res.status(400).send(JSON.stringify({
			status: "error",
			error: "bad_params"
		}));
	}
});

app.post('/api/setBUZZ', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}

	var duration = 0;
	if(req.body.freq !== undefined) {
		if(req.body.duration !== undefined) {
			duration = req.body.duration;
		}
		
		if(duration !== 0) {
			serial.write("BUZZT;" + req.body.freq + ";" + duration + ";\n");
		} else {
			serial.write("BUZZ;" + req.body.freq + ";\n");
		}
		
		res.send(JSON.stringify({
			status: "ok",
			freq: req.body.freq,
			duration: duration
		}));
	}
});

app.post('/api/resetBUZZ', (req, res) => {
	if(!serial_ready) {
		res.status(423).send(JSON.stringify({
			status: "error",
			error: "device_not_ready"
		}));
		return;
	}
	
	serial.write("NOBUZZ;\n");
	res.send(JSON.stringify({
			status: "ok",
	}));
});

app.listen(port, () => {
    console.log("HTTP server started.");
});