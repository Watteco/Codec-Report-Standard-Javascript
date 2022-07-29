/*
 * A javascript template to decode a nke Watteco ZCL "like" standard payload at a given port
 *
 * Notice trhat this template is volontary very simple to be easiliy embedable in many javascript environnemnts
 * That's why it willingly does not uses any specific API like (Buffer from Node.js, or npm, or any..)
 *
 * Basically it can be test as it is in TTN "payload formats decoder"
 *
 */
 
/*
 * To test simply present codec template on any computer, install Node.js (https://nodejs.org/en/) 
 * 
 * Then you can try decoding ZCL frames, by uncommenting first three lines below and 
 * and then use commands like these in you "terminal/command" window:
 *
 *     node decodeZCL.js 125 110A04020000290998
 *     node decodeZCL.js 125 1101800F80000041170064271080031B5800A000A00136000003E84E20901407
 *
 * You could also set the three following lines commented to implement you own Decoder(...) function calls...
 *
 */
 
var argv= process.argv.slice(2);
obj = Decoder(Buffer.from(argv[1],'hex'),parseInt(argv[0], 10 ));
console.dir(obj,{depth:null});


// ----------------------------------------------------------------
// ----------------------- FUNCTIONS PART (Deprecated) ------------
// ----------------------------------------------------------------
function UintToInt(Uint, Size) {
    if (Size === 2) {
      if ((Uint & 0x8000) > 0) {
        Uint = Uint - 0x10000;
      }
    }
    if (Size === 3) {
      if ((Uint & 0x800000) > 0) {
        Uint = Uint - 0x1000000;
      }
    }
    if (Size === 4) {
      if ((Uint & 0x80000000) > 0) {
        Uint = Uint - 0x100000000;
      }
    }


    return Uint;
}

function Bytes2Float32(bytes) {
    var sign = (bytes & 0x80000000) ? -1 : 1;
    var exponent = ((bytes >> 23) & 0xFF) - 127;
    var significand = (bytes & ~(-1 << 23));

    if (exponent == 128) 
        return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);

    if (exponent == -127) {
        if (significand == 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 22);
    } else significand = (significand | (1 << 23)) / (1 << 23);

    return sign * significand * Math.pow(2, exponent);
}

// ----------------------------------------------------------------
// ----------------------- FUNCTIONS PART -------------------------
// ----------------------------------------------------------------

/*
 * Int conversion directly from buffer with start index and required endianess 
 *
 * Type must be     : U8,I8,U16,I16,U24,I24,U32,I32,U40,I40,...,U56,I56,I64
 * LittleEndian if true either big endian
 */
function BytesToInt64(InBytes, StartIndex, Type,LittleEndian) 
{
    if( typeof(LittleEndian) == 'undefined' ) LittleEndian = false;
    
	var Signed  = (Type.substr(0,1) != "U");
	var BytesNb = parseInt(Type.substr(1,2), 10)/8;
	var inc, start; 
	var nb = BytesNb;

	if (LittleEndian)
	{
		inc = -1; 
		start = StartIndex + BytesNb - 1;
	}
	else
	{
		inc =  1; start = StartIndex ;
	}
	
	tmpInt64 = 0;
	for (j=start; nb > 0;(j+=inc,nb--)) 
	{
		tmpInt64 = (tmpInt64 << 8) + InBytes[j];
	}
	
	if ((Signed) && (BytesNb < 8) && (InBytes[start] & 0x80)) 
		tmpInt64 = tmpInt64 - (0x01 << (BytesNb * 8)); 

    return tmpInt64;
}

/*
 * Float32 conversion directly from buffer with start index and required endianess 
 *
 * LittleEndian if true either big endian
 */
function BytesToFloat32(InBytes,StartIndex,LittleEndian) {
    
	if( typeof(LittleEndian) == 'undefined' ) LittleEndian = false;
	
	var buf = InBytes.slice(StartIndex,StartIndex+4);
	if (! LittleEndian)	buf.reverse();
	var f32a = new Float32Array((new Int8Array(buf)).buffer);
	return f32a[0];
}


function decimalToHex(d, padding) {
    var hex = Number(d).toString(16).toUpperCase();
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return "0x" + hex;
}

function parseHexString(str) { 
    var result = [];
    while (str.length >= 2) { 
        result.push(parseInt(str.substring(0, 2), 16));

        str = str.substring(2, str.length);
    }

    return result;
}

function byteToHex(b) {
	const hexChar = ["0", "1", "2", "3", "4", "5", "6", "7","8", "9", "A", "B", "C", "D", "E", "F"];
	return hexChar[(b >> 4) & 0x0f] + hexChar[b & 0x0f];
}

function BytesToHexStr(buff) {
	const hexOctets = [];
    for (i = 0; i < buff.length; ++i) {
		hexOctets.push( byteToHex(buff[i],2) );
	}
    return hexOctets.join("");
}

function zeroPad(num, places) {
	return( String(num).padStart(places, '0') );
}
function Decoder(bytes, port) {
  // Decode an uplink message from a buffer
  // (array) of bytes to an object of fields.
	var decoded = {};
	decoded.lora = {};

	decoded.lora.port  = port;
	
	// Get raw payload
	var bytes_len_	= bytes.length;
	var temp_hex_str = ""

	decoded.lora.payload  = "";

	for( var j = 0; j < bytes_len_; j++ )

	{
		temp_hex_str   = bytes[j].toString( 16 ).toUpperCase( );
		if( temp_hex_str.length == 1 )
		{
		  temp_hex_str = "0" + temp_hex_str;
		}
		decoded.lora.payload += temp_hex_str;
		var date = new Date();
		decoded.lora.date = date.toISOString();
	}
	
	if (port === 125) 
	{
		//batch
		batch = !(bytes[0] & 0x01);
	
		//trame standard
		if (batch === false){
			decoded.zclheader = {};
			decoded.zclheader.report =  "standard";
			attributID = -1;
			cmdID = -1;
			clusterdID = -1;
			//endpoint
			decoded.zclheader.endpoint = ((bytes[0]&0xE0)>>5) | ((bytes[0]&0x06)<<2);
			//command ID
			cmdID =  bytes[1]; decoded.zclheader.cmdID = decimalToHex(cmdID,2);
			//Cluster ID
			clusterdID = bytes[2]*256 + bytes[3]; decoded.zclheader.clusterdID = decimalToHex(clusterdID,4);
			
			// decode report and read atrtribut response
			if((cmdID === 0x0a)|(cmdID === 0x8a)|(cmdID === 0x01)){
				decoded.data = {};
				//Attribut ID 
				attributID = bytes[4]*256 + bytes[5];decoded.zclheader.attributID = decimalToHex(attributID,4);
				
				if (cmdID === 0x8a) decoded.zclheader.alarm = 1;
				//data index start
				if ((cmdID === 0x0a) | (cmdID === 0x8a))	index = 7;
				if (cmdID === 0x01)	{index = 8; decoded.zclheader.status = bytes[6];}
				
				//temperature
				if (  (clusterdID === 0x0402 ) & (attributID === 0x0000)) decoded.data.temperature = (UintToInt(bytes[index]*256+bytes[index+1],2))/100;
				//humidity
				if (  (clusterdID === 0x0405 ) & (attributID === 0x0000)) decoded.data.humidity = (bytes[index]*256+bytes[index+1])/100;
				//binary input counter
				if (  (clusterdID === 0x000f ) & (attributID === 0x0402)) decoded.data.counter = (bytes[index]*256*256*256+bytes[index+1]*256*256+bytes[index+2]*256+bytes[index+3]);
				// binary input present value
				if (  (clusterdID === 0x000f ) & (attributID === 0x0055)) decoded.data.pin_state = !(!bytes[index]);
				//multistate output
				if (  (clusterdID === 0x0013 ) & (attributID === 0x0055)) decoded.data.value = bytes[index];
				// on/off present value
				if (  (clusterdID === 0x0006 ) & (attributID === 0x0000)) {state = bytes[index]; if(state === 1) decoded.data.state = "ON"; else decoded.data.state = "OFF" ; }
			        //differential pressure
				if (  (clusterdID === 0x8008 ) & (attributID === 0x0000)) decoded.data.differential_pressure =bytes[index]*256+bytes[index+1];
				// multibinary input present value
				if (  (clusterdID === 0x8005 ) & (attributID === 0x0000)) 
				{
					decoded.data.pin_state_1 = ((bytes[index+1]&0x01) === 0x01);
					decoded.data.pin_state_2 = ((bytes[index+1]&0x02) === 0x02);
					decoded.data.pin_state_3 = ((bytes[index+1]&0x04) === 0x04);
					decoded.data.pin_state_4 = ((bytes[index+1]&0x08) === 0x08);
					decoded.data.pin_state_5 = ((bytes[index+1]&0x10) === 0x10);
					decoded.data.pin_state_6 = ((bytes[index+1]&0x20) === 0x20);
					decoded.data.pin_state_7 = ((bytes[index+1]&0x40) === 0x40);
					decoded.data.pin_state_8 = ((bytes[index+1]&0x80) === 0x80);
					decoded.data.pin_state_9 = ((bytes[index]&0x01) === 0x01);
					decoded.data.pin_state_10 = ((bytes[index]&0x02) === 0x02);
				}
				//analog input
				if (  (clusterdID === 0x000c ) & (attributID === 0x0055)) decoded.data.analog = Bytes2Float32(bytes[index]*256*256*256+bytes[index+1]*256*256+bytes[index+2]*256+bytes[index+3]);

				//modbus 
				if (  (clusterdID === 0x8007 ) & (attributID === 0x0001)) 
				{
					decoded.data.payload = "";
					decoded.data.modbus_payload = "";
					decoded.data.size = bytes[index]; 
					decoded.data.modbus_float = 0; // 0: pas de décodage float 1: décodage float 2: décodage float 2word inversé
					for( var j = 0; j < decoded.data.size; j++ )
					{
						
						temp_hex_str   = bytes[index+j+1].toString( 16 ).toUpperCase( );
						if( temp_hex_str.length == 1 )
						{
							temp_hex_str = "0" + temp_hex_str;
						}
						decoded.data.payload += temp_hex_str;
						
						if (j == 0)
						{
							decoded.data.modbus_address = bytes[index+j+1];
						}
						else if (j == 1)
						{
							decoded.data.modbus_commandID = bytes[index+j+1];
						}
						else if (j == 2)
						{
							decoded.data.modbus_size = bytes[index+j+1];
						}
						else{
							decoded.data.modbus_payload += temp_hex_str;
							if (decoded.data.modbus_float == 1){ // big endian
								if (j == 3)		decoded.data.fregister_00 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 7)		decoded.data.fregister_01 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 11)	decoded.data.fregister_02 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 15)	decoded.data.fregister_03 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 19)	decoded.data.fregister_04 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 23)	decoded.data.fregister_05 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 27)	decoded.data.fregister_06 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 31)	decoded.data.fregister_07 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 35)	decoded.data.fregister_08 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
								if (j == 35)	decoded.data.fregister_09 = Bytes2Float32(bytes[index+j+1]*256*256*256+bytes[index+j+1+1]*256*256+bytes[index+j+1+2]*256+bytes[index+j+1+3]);
							}
							if (decoded.data.modbus_float == 2){ // float little endian 2 word
								if (j == 3)		decoded.data.fregister_00 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 7)		decoded.data.fregister_01 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 11)	decoded.data.fregister_02 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 15)	decoded.data.fregister_03 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 19)	decoded.data.fregister_04 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 23)	decoded.data.fregister_05 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 27)	decoded.data.fregister_06 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 31)	decoded.data.fregister_07 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 35)	decoded.data.fregister_08 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
								if (j == 35)	decoded.data.fregister_09 = Bytes2Float32(bytes[index+j+1]*256+bytes[index+j+1+1]+bytes[index+j+1+2]*256*256*256+bytes[index+j+1+3]*256*256);
							}
							
						}
						
					}
				}
				
				//multimodbus 
				if (  (clusterdID === 0x8009 ) & (attributID === 0x0000)) 
				{
					decoded.data.payloads = "";
					decoded.data.size = bytes[index]; 
					decoded.data.multimodbus_frame_series_sent = bytes[index+1];
					decoded.data.multimodbus_frame_number_in_serie = (bytes[index+2] & 0xE0) >> 5; 
					decoded.data.multimodbus_last_frame_of_serie = (bytes[index+2] & 0x1C ) >> 2; 
					decoded.data.multimodbus_EP9 = ((bytes[index+2]&0x01) === 0x01);
					decoded.data.multimodbus_EP8 = ((bytes[index+2]&0x02) === 0x02);
					decoded.data.multimodbus_EP7 = ((bytes[index+3]&0x80) === 0x80);
					decoded.data.multimodbus_EP6 = ((bytes[index+3]&0x40) === 0x40);
					decoded.data.multimodbus_EP5 = ((bytes[index+3]&0x20) === 0x20);
					decoded.data.multimodbus_EP4 = ((bytes[index+3]&0x10) === 0x10);
					decoded.data.multimodbus_EP3 = ((bytes[index+3]&0x08) === 0x08);
					decoded.data.multimodbus_EP2 = ((bytes[index+3]&0x04) === 0x04);
					decoded.data.multimodbus_EP1 = ((bytes[index+3]&0x02) === 0x02);
					decoded.data.multimodbus_EP0 = ((bytes[index+3]&0x01) === 0x01); 
					index2 = index + 4;
					without_header = 0;

					if (decoded.data.multimodbus_EP0 === true)
					{
						if (without_header === 0){
							decoded.data.multimodbus_EP0_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP0_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP0_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP0_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP0_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP0_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP0_datasize;
					}
					
					if (decoded.data.multimodbus_EP1 === true)
					{
						if (without_header === 0){
							decoded.data.multimodbus_EP1_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP1_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP1_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP1_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP1_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP1_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP1_datasize;
					}
					if (decoded.data.multimodbus_EP2 === true)
					{
						if (without_header === 0){						
							decoded.data.multimodbus_EP2_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP2_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP2_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP2_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP2_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP2_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP2_datasize;
					}
					if (decoded.data.multimodbus_EP3 === true)
					{
						if (without_header === 0){						
							decoded.data.multimodbus_EP3_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP3_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP3_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP3_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP3_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP3_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP3_datasize;
					}
					if (decoded.data.multimodbus_EP4 === true)
					{
						if (without_header === 0){
							decoded.data.multimodbus_EP4_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP4_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP4_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP4_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP4_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP4_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP4_datasize;
					}
					if (decoded.data.multimodbus_EP5 === true)
					{
						if (without_header === 0){					
							decoded.data.multimodbus_EP5_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP5_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP5_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP5_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP5_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP5_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP5_datasize;
					}
					if (decoded.data.multimodbus_EP6 === true)
					{
						if (without_header === 0){
							decoded.data.multimodbus_EP6_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP6_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP6_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP6_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP6_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP6_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP6_datasize;
					}
					if (decoded.data.multimodbus_EP7 === true)
					{
						if (without_header === 0){
							decoded.data.multimodbus_EP7_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP7_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP7_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP7_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP7_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP7_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP7_datasize;
					}
					if (decoded.data.multimodbus_EP8 === true)
					{
						if (without_header === 0){
							decoded.data.multimodbus_EP8_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP8_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP8_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP8_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP8_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP8_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP8_datasize;
					}
					if (decoded.data.multimodbus_EP9 === true)
					{
						if (without_header === 0){						
							decoded.data.multimodbus_EP6_slaveID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP6_fnctID = bytes[index2];
							index2 = index2 + 1;
							decoded.data.multimodbus_EP6_datasize = bytes[index2];
							index2 = index2 + 1;
						}
						decoded.data.multimodbus_EP6_payload = ""
						if (bytes[index2] === undefined ) return decoded;
						for( var j = 0; j < decoded.data.multimodbus_EP6_datasize; j++ )
						{
							temp_hex_str   = bytes[index2+j].toString( 16 ).toUpperCase( );
							if( temp_hex_str.length == 1 )
							{
								temp_hex_str = "0" + temp_hex_str;
							}
							decoded.data.multimodbus_EP6_payload += temp_hex_str;
						}
						index2 = index2 + decoded.data.multimodbus_EP6_datasize;
					}

				}
				
				//simple metering
				if (  (clusterdID === 0x0052 ) & (attributID === 0x0000)) {
					decoded.data.active_energy_Wh = UintToInt(bytes[index+1]*256*256+bytes[index+2]*256+bytes[index+3],3);
					decoded.data.reactive_energy_Varh = UintToInt(bytes[index+4]*256*256+bytes[index+5]*256+bytes[index+6],3);
					decoded.data.nb_samples = (bytes[index+7]*256+bytes[index+8]);
					decoded.data.active_power_W = UintToInt(bytes[index+9]*256+bytes[index+10],2);
					decoded.data.reactive_power_VAR = UintToInt(bytes[index+11]*256+bytes[index+12],2);
				}
				// lorawan message type
				if (  (clusterdID === 0x8004 ) & (attributID === 0x0000)) {
				  if (bytes[index] === 1)
					decoded.data.message_type = "confirmed";
				  if (bytes[index] === 0)
					decoded.data.message_type = "unconfirmed";
				}
				
				// lorawan retry
				if (  (clusterdID === 0x8004 ) & (attributID === 0x0001)) {
						decoded.data.nb_retry= bytes[index] ;
				}
				
				// lorawan reassociation
				if (  (clusterdID === 0x8004 ) & (attributID === 0x0002)) {
					decoded.data.period_in_minutes = bytes[index+1] *256+bytes[index+2];
					decoded.data.nb_err_frames = bytes[index+3] *256+bytes[index+4];
				}
				// configuration node power desc
				if (   (clusterdID === 0x0050 ) & (attributID === 0x0006)) {
				  index2 = index + 3;
				  if ((bytes[index+2] &0x01) === 0x01) {decoded.data.main_or_external_voltage = (bytes[index2]*256+bytes[index2+1])/1000;index2=index2+2;}
				  if ((bytes[index+2] &0x02) === 0x02) {decoded.data.rechargeable_battery_voltage = (bytes[index2]*256+bytes[index2+1])/1000;index2=index2+2;}
				  if ((bytes[index+2] &0x04) === 0x04) {decoded.data.disposable_battery_voltage = (bytes[index2]*256+bytes[index2+1])/1000;index2=index2+2;}
				  if ((bytes[index+2] &0x08) === 0x08) {decoded.data.solar_harvesting_voltage = (bytes[index2]*256+bytes[index2+1])/1000;index2=index2+2;}
				  if ((bytes[index+2] &0x10) === 0x10) {decoded.data.tic_harvesting_voltage = (bytes[index2]*256+bytes[index2+1])/1000;index2=index2+2;}
				}
				//energy and power metering
				if (  (clusterdID === 0x800a) & (attributID === 0x0000)) {
					index2 = index;
					decoded.data.sum_positive_active_energy_Wh = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.sum_negative_active_energy_Wh = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.sum_positive_reactive_energy_Wh = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.sum_negative_reactive_energy_Wh = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.positive_active_power_W = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.negative_active_power_W = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.positive_reactive_power_W = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
					index2 = index2 + 4; 
					decoded.data.negative_reactive_power_W = UintToInt(bytes[index2+1]*256*256*256+bytes[index2+2]*256*256+bytes[index2+3]*256+bytes[index2+4],4);
				}
				//energy and power metering
				if (  (clusterdID === 0x800b) & (attributID === 0x0000)) {
					index2 = index;
					decoded.data.Vrms = UintToInt(bytes[index2+1]*256+bytes[index2+2],2)/10;
					index2 = index2 + 2; 
					decoded.data.Irms = UintToInt(bytes[index2+1]*256+bytes[index2+2],2)/10;
					index2 = index2 + 2; 
					decoded.data.phase_angle = UintToInt(bytes[index2+1]*256+bytes[index2+2],2);
				}
				//concentration
				if (  (clusterdID === 0x800c) & (attributID === 0x0000)) {
					decoded.data.Concentration = (bytes[index]*256+bytes[index+1]);
				}
				//illuminance
				if (  (clusterdID === 0x0400) & (attributID === 0x0000)) {
					decoded.data.Illuminance = (bytes[index]*256+bytes[index+1]);
				}
				//Pressure
				if (  (clusterdID === 0x0403) & (attributID === 0x0000)) {
					decoded.data.Pressure = (UintToInt(bytes[index]*256+bytes[index+1],2));
				}
				//Occupancy
				if (  (clusterdID === 0x0406) & (attributID === 0x0000)) {
					decoded.data.Occupancy = !(!bytes[index]);
				}
				// power quality by WattSense
				if ((clusterdID === 0x8052) & (attributID === 0x0000)) {
					index2 = index;
					decoded.data.frequency =
						(UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) +
							22232) /
						1000;
					index2 = index2 + 2;
					decoded.data.frequency_min =
						(UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) +
							22232) /
						1000;
					index2 = index2 + 2;
					decoded.data.frequency_max =
						(UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) +
							22232) /
						1000;
					index2 = index2 + 2;
					decoded.data.Vrms =
						UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) / 10;
					index2 = index2 + 2;
					decoded.data.Vrms_min =
						UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) / 10;
					index2 = index2 + 2;
					decoded.data.Vrms_max =
						UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) / 10;
					index2 = index2 + 2;
					decoded.data.Vpeak =
						UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) / 10;
					index2 = index2 + 2;
					decoded.data.Vpeak_min =
						UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) / 10;
					index2 = index2 + 2;
					decoded.data.Vpeak_max =
						UintToInt(
							bytes[index2 + 1] * 256 + bytes[index2 + 2],
							2
						) / 10;
					index2 = index2 + 2;
					decoded.data.over_voltage = UintToInt(
						bytes[index2 + 1] * 256 + bytes[index2 + 2],
						2
					);
					index2 = index2 + 2;
					decoded.data.sag_voltage = UintToInt(
						bytes[index2 + 1] * 256 + bytes[index2 + 2],
						2
					);
				}
				
				//XYZ Acceleration : Last on XYZ
				if (  (clusterdID === 0x800f) ) {
					i = index+1;
					if (attributID === 0x0000) {
						o = decoded.data.Last = {};
						o.NbTriggedAcq = BytesToInt64(bytes,i,"U32"); i+=4;
						o.Mean_X_G = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Max_X_G  = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Dt_X_ms  = BytesToInt64(bytes,i,"U16"); i+=2;
						o.Mean_Y_G = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Max_Y_G  = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Dt_Y_ms  = BytesToInt64(bytes,i,"U16"); i+=2;
						o.Mean_Z_G = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Max_Z_G  = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Dt_Z_ms  = BytesToInt64(bytes,i,"U16"); 
					} else if (attributID === 0x0001 || (attributID === 0x0002) || (attributID === 0x0003)){
						ext = (attributID === 0x0001 ? "Stats_X" : (attributID === 0x0002 ? "Stats_Y" : "Stats_Z"));
						o = decoded.data[ext] = {};
						o.NbAcq     = BytesToInt64(bytes,i,"U16"); i+=2;
						o.MinMean_G = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.MinMax_G  = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.MinDt     = BytesToInt64(bytes,i,"U16"); i+=2;
						o.MeanMean_G= BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.MeanMax_G = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.MeanDt    = BytesToInt64(bytes,i,"U16"); i+=2;
						o.MaxMean_G = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.MaxMax_G  = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.MaxDt     = BytesToInt64(bytes,i,"U16"); i+=2;
					} else if (attributID === 0x8000) {
						o = decoded.data.Params = {};
						o.WaitFreq_Hz       = BytesToInt64(bytes,i,"U16")/10.0; i+=2;
						o.AcqFreq_Hz        = BytesToInt64(bytes,i,"U16")/10.0; i+=2;
						delay = BytesToInt64(bytes,i,"U16"); i+=2;
						if (delay & 0x8000) delay = (delay & (~0x8000)) * 60;
						o.NewWaitDelay_s    = (delay & 0x8000 ? delay = (delay & (~0x8000)) * 60 : delay);
						o.MaxAcqDuration_ms = BytesToInt64(bytes,i,"U16"); i+=2;
						o.Threshold_X_G     = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Threshold_Y_G     = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.Threshold_Z_G     = BytesToInt64(bytes,i,"U16")/100.0; i+=2;
						o.OverThrsh_Dt_ms   = BytesToInt64(bytes,i,"U16"); i+=2;
						o.UnderThrsh_Dt_ms  = BytesToInt64(bytes,i,"U16"); i+=2;
						o.Range_G           = BytesToInt64(bytes,i,"U16")/100; i+=2;
						o.FilterSmoothCoef  = BytesToInt64(bytes,i,"U8"); i+=1;
						o.FilterGainCoef    = BytesToInt64(bytes,i,"U8"); i+=1;
						o = decoded.data.Params.WorkingModes = {};
						o.SignalEachAcq     = (bytes[i] & 0x80 ? "true" : "false");
						o.RstAftStdRpt_X    = (bytes[i] & 0x01 ? "true" : "false");
						o.RstAftStdRpt_Y    = (bytes[i] & 0x02 ? "true" : "false");
						o.RstAftStdRpt_7    = (bytes[i] & 0x04 ? "true" : "false");
					}
				}
				
			}
		
			//decode configuration response
			if(cmdID === 0x07){
				//AttributID
				attributID = bytes[6]*256 + bytes[7];decoded.zclheader.attributID = decimalToHex(attributID,4);
				//status
				decoded.zclheader.status = bytes[4];
				//batch
				decoded.zclheader.batch = bytes[5];
			}
			
			
			//decode read configuration response
			if(cmdID === 0x09){
				//AttributID
				attributID = bytes[6]*256 + bytes[7];decoded.zclheader.attributID = decimalToHex(attributID,4);
				//status
				decoded.zclheader.status = bytes[4];
				//batch
				decoded.zclheader.batch = bytes[5];
				
				//AttributType
				decoded.zclheader.attribut_type = bytes[8];
				//min
				decoded.zclheader.min = {}
				if ((bytes[9] & 0x80) === 0x80) {decoded.zclheader.min.value = (bytes[9]-0x80)*256+bytes[10];decoded.zclheader.min.unity = "minutes";} else {decoded.zclheader.min.value = bytes[9]*256+bytes[10];decoded.zclheader.min.unity = "seconds";}
				//max
				decoded.zclheader.max = {}
				if ((bytes[11] & 0x80) === 0x80) {decoded.zclheader.max.value = (bytes[11]-0x80)*256+bytes[12];decoded.zclheader.max.unity = "minutes";} else {decoded.zclheader.max.value = bytes[9]*256+bytes[10];decoded.zclheader.max.unity = "seconds";}
				decoded.lora.payload  = "";

			}
		
		}
		else
		{
			decoded.batch = {};
			decoded.batch.report = "batch";
		}
	}
  return decoded;
}

