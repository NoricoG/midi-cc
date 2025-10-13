const defaultPluginNames = {
    53: [
        "Sawtooth",
        "Triangle",
        "Square",
        "VPN"
    ],
    117: [
        "Up",
        "Down",
        "Up-Down",
        "Down-Up",
        "Converge",
        "Diverge",
        "Conv.-Div.",
        "Div.-Conv.",
        "Random",
        "Stchastic"
    ],
    118: [
        "Octave",
        "Maj Triad",
        "Maj Suspended",
        "Maj Augumented",
        "Min Triad",
        "Min Diminished"
    ],
    14: [
        "ADSR",
        "AHR",
        "AR",
        "AR Loop",
        "Open"
    ],
    88: [
        "Off",
        "Chorus",
        "Ensemble",
        "Phaser",
        "Flanger"
    ],
    89: [
        "Off",
        "Stereo",
        "Mono",
        "Ping Pong",
        "High Pass",
        "Tape"
    ],
    90: [
        "Off",
        "Hall",
        "Plate",
        "Space",
        "Riser",
        "Submarine"
    ],
    42: [
        "LowPass 2p",
        "LowPass 4p",
        "BandPass 2p",
        "BandPass 4p",
        "HighPass 2p",
        "HighPass 4p",
        "Off"
    ]
}


// based on https://github.com/oscarrc/nts-web/blob/master/src/hooks/useNTS.jsx
class Nts1PluginFetcher {
    private sysex = {
        vendor: 66,
        channel: 0,
        device: 87,
    };
    private defaultControls: any = {};
    private index = [88, 89, 90, 53];

    private decode(data: number[]): string {
        let nameBytes = data.slice(30, data.length - 1);
        let decodedString = "";
        nameBytes.forEach(byte => {
            if (byte) {
                decodedString = decodedString + String.fromCharCode(byte);
            }
        });
        return decodedString.replace(/[^a-zA-Z0-9 -]/g, "");
    }

    async fetchPluginNames(input: any, output: any): Promise<any> {
        return new Promise(resolve => {
            let type = 1;
            let bank = 0;
            let controls: any = JSON.parse(JSON.stringify(defaultPluginNames));
            const index = this.index;

            if (!input || !output) {
                console.error("MIDI devices not available.");
                return this.defaultControls;
            }

            const get = (e: any) => {
                if (e.data.length === 53) {
                    const decoded = this.decode(e.data);
                    const controlIndex = index[type - 1];
                    if (!controls[controlIndex]) {
                        controls[controlIndex] = [];
                    }
                    if (controls[controlIndex].includes(decoded)) {
                        console.log("Duplicate plugin uploaded by user", decoded);
                    }
                    controls[controlIndex].push(decoded);
                }

                // request next plugin name, at the next bank within the same type or in the next type
                if (bank < 16) {
                    bank++;
                    output.sendSysex(this.sysex.vendor, [48 + this.sysex.channel, 0, 1, this.sysex.device, 25, type, bank]);
                } else if (type < 4) {
                    bank = 0;
                    type++;
                    output.sendSysex(this.sysex.vendor, [48 + this.sysex.channel, 0, 1, this.sysex.device, 25, type, bank]);
                } else {
                    input.removeListener("sysex", get);
                    console.log("Labels fetched:", controls);
                    resolve(controls);
                }
            };

            // make sure we can receive the sysex messages that contain the plugin names
            input.addListener("sysex", get);

            // get the NTS-1 to send us sysex messages
            // either sysex messages seems to do the trick, it's not needed to send both
            output.sendSysex(this.sysex.vendor, [80, 0, 2]);
            output.sendSysex(this.sysex.vendor, [48 + this.sysex.channel, 0, 1, this.sysex.device, 25, type, bank]);
        });
    }
}

