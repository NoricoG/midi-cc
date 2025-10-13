const devices = [
    {
        "name": "NTS-1",
        "in": "NTS-1 digital kit",
        "out": "NTS-1 digital kit"
    },
    // other input output names I have observed
    {
        "name": "NTS-1",
        "in": "NTS-1 digital kit KBD/KNOB",
        "out": "NTS-1 digital kit SOUND"
    },
    {
        "name": "NTS-1 MK2",
        "in": "TODO",
        "out": "TODO"
    },
    {
        "name": "MicroFreak",
        "in": "Arturia MicroFreak",
        "out": "Arturia MicroFreak"
    }
];
const synthCategoryCc = {
    "NTS-1": {
        "Oscillator": {
            "Type": 53,
            "Shape": 54,
            "Alt": 55,
        },
        "Filter": {
            "Type": 42,
            "Cutoff": 43,
            "Resonance": 44,
        },
        "Envelope": {
            "Type": 14,
            "Attack": 16,
            "Release": 19
        },
        "LFO": {
            "Osc LFO Rate": 24,
            "Osc LFO Depth": 26,
            "Filter Sweep Rate": 46,
            "Filter Sweep Depth": 45,
            "EG Tremolo Rate": 20,
            "EG Tremolo Depth": 21,
        },
        "Mod": {
            "Type": 88,
            "Time": 28,
            "Depth": 29
        },
        "Delay": {
            "Type": 89,
            "Time": 30,
            "Depth": 31,
            "Mix": 33,
        },
        "Reverb": {
            "Type": 90,
            "Time": 34,
            "Depth": 35,
            "Mix": 36,
        },
        "Arp": {
            "Pattern": 117,
            "Intervals": 118,
            "Length": 119,
        }
    },
    "NTS-1 MK2": {
    // TODO
    },
    "MicroFreak": {
        "Oscillator": {
            "Type": 9,
            "Wave": 10,
            "Timbre": 12,
            "Shape": 13
        },
        "Filter": {
            "Cutoff": 23,
            "Resonance": 83,
        },
        "Envelope": {
            "Attack": 105,
            "Decay / Release": 106,
            "Sustain": 29,
            "Filter Amount": 26
        },
        "Cycling Envelope": {
            "Rise": 102,
            "Hold": 28,
            "Fall": 103,
            "Amount": 24
        },
        "Arp/Seq": {
            "Rate (free)": 91,
            "Rate (sync)": 92,
        },
        "LFO": {
            "Rate (free)": 93,
            "Rate (sync)": 94,
        },
        "Misc": {
            "Glide Time": 5,
            "Keyboard Hold": 64,
            "Spice": 2,
        }
    }
};
// defaults that should not be 0
const differentDefaults = {
    "NTS-1": {
        "Filter": {
            "Cutoff": 127
        },
        "LFO": {
            "Osc LFO Depth": 64,
            "Filter Sweep Depth": 64,
        },
        "Delay": {
            "Mix": 64,
        },
        "Reverb": {
            "Mix": 64,
        }
    },
    "MicroFreak": {
        "Filter": {
            "Cutoff": 99
        },
        "Envelope": {
            "Sustain": 127,
            "Filter Amount": 64
        },
    }
};
const categoryNotRandom = ["Misc"];
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
};
// based on https://github.com/oscarrc/nts-web/blob/master/src/hooks/useNTS.jsx
class Nts1PluginFetcher {
    constructor() {
        this.sysex = {
            vendor: 66,
            channel: 0,
            device: 87,
        };
        this.defaultControls = {};
        this.index = [88, 89, 90, 53];
    }
    decode(data) {
        let nameBytes = data.slice(30, data.length - 1);
        let decodedString = "";
        nameBytes.forEach(byte => {
            if (byte) {
                decodedString = decodedString + String.fromCharCode(byte);
            }
        });
        return decodedString.replace(/[^a-zA-Z0-9 -]/g, "");
    }
    async fetchPluginNames(input, output) {
        return new Promise(resolve => {
            let type = 1;
            let bank = 0;
            let controls = JSON.parse(JSON.stringify(defaultPluginNames));
            const index = this.index;
            if (!input || !output) {
                console.error("MIDI devices not available.");
                return this.defaultControls;
            }
            const get = (e) => {
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
                }
                else if (type < 4) {
                    bank = 0;
                    type++;
                    output.sendSysex(this.sysex.vendor, [48 + this.sysex.channel, 0, 1, this.sysex.device, 25, type, bank]);
                }
                else {
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
const MIDI_CC_MIN = 0;
const MIDI_CC_MAX = 127;
// state
let selectedDevice = null;
let sliderElements = {};
let input = null;
let output = null;
let outputChannel = null;
let rangeTranslator = null;
WebMidi
    .enable({ sysex: true })
    .then(onEnabled)
    .catch((err) => alert(err.stack ? err.stack : err.message));
function onEnabled() {
    selectDevices();
    createUi();
}
function selectDevices() {
    for (let device of devices) {
        const hasInput = WebMidi.getInputByName(device["in"]) !== undefined;
        const hasOutput = WebMidi.getOutputByName(device["out"]) !== undefined;
        if (hasInput && hasOutput) {
            selectedDevice = device["name"];
            document.getElementById("title").innerText = selectedDevice;
            input = WebMidi.getInputByName(device["in"]);
            input.addListener("controlchange", (e) => {
                receiveCc(e.dataBytes[0], e.dataBytes[1]);
            });
            output = WebMidi.getOutputByName(device["out"]);
            outputChannel = output.channels[1];
            if (selectedDevice === "NTS-1") {
                console.log("[selectDevices] Creating Nts1RangeTranslator");
                rangeTranslator = new Nts1RangeTranslator();
                const getRangeLabelsPromise = rangeTranslator.getRangeLabels();
                getRangeLabelsPromise.then(() => {
                    console.log("[selectDevices] getRangeLabels finished", rangeTranslator.controls);
                });
            }
            else {
                rangeTranslator = new RangeTranslator();
            }
            // only select 1 device (for now)
            break;
        }
    }
    if (selectedDevice === null) {
        let alertString = "No known device found. Please connect one of the following supported devices (input, output):\n";
        devices.forEach((device) => {
            alertString += `- ${device["name"]} (${device["in"]}, ${device["out"]})\n`;
        });
        alertString += "Connected input devices:\n";
        WebMidi.inputs.forEach((device, _) => {
            alertString += `- ${device.name}\n`;
        });
        alertString += "Connected output devices:\n";
        WebMidi.outputs.forEach((device, _) => {
            alertString += `- ${device.name}\n`;
        });
        alert(alertString);
        return;
    }
}
function createUi() {
    const categoriesElement = document.getElementById("categories");
    createButton(categoriesElement, "🎲 Random All", () => randomiseAllCategories());
    createButton(categoriesElement, "✖ Reset All", () => resetAllCategories());
    createButton(categoriesElement, "🎹 Note Sample", () => playNoteSample());
    createButton(categoriesElement, "⛔ Panic", () => {
        outputChannel.sendAllSoundOff();
        output.sendStop();
    });
    for (const category in synthCategoryCc[selectedDevice]) {
        const categoryElement = createElement(categoriesElement, "div", "category");
        const categoryTitle = createElement(categoryElement, "h2", undefined, category);
        if (!categoryNotRandom.includes(category)) {
            createButton(categoryElement, "🎲 Random", () => randomiseCategory(category));
        }
        createButton(categoryElement, "✖ Reset", () => resetCategory(category));
        sliderElements[category] = {};
        for (const ccLabel in synthCategoryCc[selectedDevice][category]) {
            const cc = synthCategoryCc[selectedDevice][category][ccLabel];
            const ccElement = createElement(categoryElement, "div", "cc");
            const initialValue = getDefaultValue(category, ccLabel);
            const ccSlider = createSlider(ccElement, MIDI_CC_MIN, MIDI_CC_MAX, initialValue, (value) => {
                const parsedValue = parseInt(value);
                sendCc(cc, parsedValue);
                updateUiCcValueLabel(cc, category, ccLabel, parsedValue);
            });
            sliderElements[category][ccLabel] = ccSlider;
            createElement(ccElement, "span", undefined, ccLabel);
            const ccValue = createElement(ccElement, "span", undefined, "0");
            ccValue.style.width = "4ch";
        }
    }
    playNoteSample(false, true);
}
function createElement(parentElement, tag, className, textContent) {
    const element = document.createElement(tag);
    if (className)
        element.className = className;
    if (textContent)
        element.textContent = textContent;
    parentElement.appendChild(element);
    return element;
}
function createButton(parentElement, text, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClick;
    parentElement.appendChild(button);
    return button;
}
function createSlider(parentElement, min, max, value, onChange) {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = "1";
    slider.oninput = (e) => {
        const target = e.target;
        onChange(target.value);
    };
    parentElement.appendChild(slider);
    return slider;
}
function sendCc(cc, value) {
    outputChannel.sendControlChange(cc, value);
}
function randomiseCategory(category) {
    const ccList = synthCategoryCc[selectedDevice][category];
    for (const ccLabel in ccList) {
        const cc = ccList[ccLabel];
        const value = Math.floor(Math.random() * (MIDI_CC_MAX + 1));
        sendCc(cc, value);
        updateUiCc(cc, category, ccLabel, value);
    }
    playNoteSample();
}
function randomiseAllCategories() {
    for (const category in synthCategoryCc[selectedDevice]) {
        if (!categoryNotRandom.includes(category)) {
            randomiseCategory(category);
        }
    }
}
function resetCategory(category) {
    const ccList = synthCategoryCc[selectedDevice][category];
    for (const ccLabel in ccList) {
        const cc = ccList[ccLabel];
        const value = getDefaultValue(category, ccLabel);
        sendCc(cc, value);
        updateUiCc(cc, category, ccLabel, value);
    }
    playNoteSample();
}
function getDefaultValue(category, ccLabel) {
    if (differentDefaults[selectedDevice] &&
        differentDefaults[selectedDevice][category] &&
        differentDefaults[selectedDevice][category][ccLabel] !== undefined) {
        return differentDefaults[selectedDevice][category][ccLabel];
    }
    else {
        return 0;
    }
}
function resetAllCategories() {
    for (const category in synthCategoryCc[selectedDevice]) {
        resetCategory(category);
    }
}
function receiveCc(command, value) {
    try {
        const [category, label] = Object.entries(synthCategoryCc[selectedDevice]).flatMap(([category, ccs]) => Object.entries(ccs).filter(([ccLabel, cc]) => cc === command).map(([ccLabel, cc]) => [category, ccLabel]))[0];
        updateUiCc(command, category, label, value);
    }
    catch (error) {
        console.log("Received CC not in config:", command);
        return;
    }
}
function updateUiCc(command, category, label, value) {
    sliderElements[category][label].value = value.toString();
    updateUiCcValueLabel(command, category, label, value);
}
function updateUiCcValueLabel(command, category, label, value) {
    const ccLabelElement = sliderElements[category][label].nextSibling.nextSibling;
    ccLabelElement.innerText = rangeTranslator.translate(command, value);
    console.log(rangeTranslator.translate(command, value));
}
function playNoteSample(octaves = true, hold = true) {
    const shortDuration = 100;
    const longDuration = 500;
    const nOctaves = 6;
    if (octaves) {
        for (let i = 0; i < 6; i++) {
            outputChannel.playNote(`C${i + 1}`, { duration: shortDuration, time: `+${i * shortDuration}` });
        }
    }
    if (hold) {
        outputChannel.playNote("C4", { duration: longDuration, time: `+${nOctaves * shortDuration}` });
    }
}
class RangeTranslator {
    translate(cc, value) {
        return value.toString();
    }
}
class Nts1RangeTranslator extends RangeTranslator {
    constructor() {
        super(...arguments);
        this.controls = {};
    }
    async getRangeLabels() {
        const nts1Fetcher = new Nts1PluginFetcher();
        this.controls = await nts1Fetcher.fetchPluginNames(input, output);
    }
    translate(cc, value) {
        if (this.controls[cc]) {
            const labels = this.controls[cc];
            // last label gets max value
            if (value == 127) {
                return labels[labels.length - 1];
            }
            // TODO: adapt logic to full range of values, coming from slider
            // Or let slider not use the full range but only specific values
            // other labels get an even offset
            const offsetPerLabel = Math.floor(128 / labels.length);
            if (value % offsetPerLabel !== 0) {
                console.error(`value ${value} does not match ${labels.length} labels (${labels}) evenly, expecting a multiple of ${offsetPerLabel}`);
            }
            const index = Math.floor(value / offsetPerLabel);
            return labels[index];
        }
        else {
            return value.toString();
        }
    }
}
