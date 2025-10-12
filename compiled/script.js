const devices = {
    "NTS-1": {
        "in": "NTS-1 digital kit KBD/KNOB",
        "out": "NTS-1 digital kit SOUND"
    },
    "NTS-1 MK2": {
        "in": "TODO",
        "out": "TODO"
    },
    "MicroFreak": {
        "in": "Arturia MicroFreak",
        "out": "Arturia MicroFreak"
    }
};
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
const MIDI_CC_MIN = 0;
const MIDI_CC_MAX = 127;
// state
let selectedDevice = null;
let sliderElements = {};
let output;
let outputChannel;
WebMidi
    .enable()
    .then(onEnabled)
    .catch((err) => alert(err));
function onEnabled() {
    selectDevices();
    createUi();
}
function selectDevices() {
    for (const device in devices) {
        const hasInput = WebMidi.getInputByName(devices[device]["in"]) !== undefined;
        const hasOutput = WebMidi.getOutputByName(devices[device]["out"]) !== undefined;
        if (hasInput && hasOutput) {
            selectedDevice = device;
            document.getElementById("title").innerText = selectedDevice;
        }
    }
    if (selectedDevice === null) {
        let alertString = "No known device found. Please connect one of the following supported devices (input, output):\n";
        for (const device in devices) {
            alertString += `- ${device} (${devices[device]["in"]}, ${devices[device]["out"]})\n`;
        }
        alertString += "Connected input devices:\n";
        WebMidi.inputs.forEach((device, index) => {
            alertString += `- ${device.name}\n`;
        });
        alertString += "Connected output devices:\n";
        WebMidi.outputs.forEach((device, index) => {
            alertString += `- ${device.name}\n`;
        });
        alert(alertString);
        return;
    }
    const input = WebMidi.getInputByName(devices[selectedDevice]["in"]);
    input.addListener("controlchange", (e) => {
        receiveCc(e.dataBytes[0], e.dataBytes[1]);
    });
    output = WebMidi.getOutputByName(devices[selectedDevice]["out"]);
    outputChannel = output.channels[1];
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
                sendCc(cc, parseInt(value));
                updateUiCcValueLabel(category, ccLabel, value);
            });
            sliderElements[category][ccLabel] = ccSlider;
            const ccValue = createElement(ccElement, "span", undefined, "0");
            ccValue.style.width = "4ch";
            createElement(ccElement, "span", undefined, ccLabel);
        }
    }
    playNoteSample();
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
        updateUiCc(category, ccLabel, value);
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
        updateUiCc(category, ccLabel, value);
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
        updateUiCc(category, label, value);
    }
    catch (error) {
        console.log("Received CC not in config:", command);
        return;
    }
}
function updateUiCc(category, label, value) {
    sliderElements[category][label].value = value.toString();
    updateUiCcValueLabel(category, label, value.toString());
}
function updateUiCcValueLabel(category, label, value) {
    const ccLabelElement = sliderElements[category][label].nextSibling;
    ccLabelElement.innerText = value;
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
