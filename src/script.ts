declare const WebMidi: any;

const MIDI_CC_MIN = 0;
const MIDI_CC_MAX = 127;

// state
let selectedDevice: string | null = null;
let sliderElements: Record<string, Record<string, HTMLInputElement>> = {};
let input: any = null;
let output: any = null;
let outputChannel: any = null;

WebMidi
    .enable({ sysex: true })
    .then(onEnabled)
    .catch((err: Error) => alert(err.stack ? err.stack : err.message));

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
            document.getElementById("title")!.innerText = selectedDevice;

            input = WebMidi.getInputByName(device["in"]);
            input.addListener("controlchange", (e: any) => {
                receiveCc(e.dataBytes[0], e.dataBytes[1]);
            });

            output = WebMidi.getOutputByName(device["out"]);
            outputChannel = output.channels[1];

            if (selectedDevice === "NTS-1") {
                (async () => {
                    await getNts1PluginNames(input, output);
                })();
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
        WebMidi.inputs.forEach((device: any, _) => {
            alertString += `- ${device.name}\n`;
        });
        alertString += "Connected output devices:\n";
        WebMidi.outputs.forEach((device: any, _) => {
            alertString += `- ${device.name}\n`;
        });
        alert(alertString);
        return;
    }


}

function createUi() {
    const categoriesElement = document.getElementById("categories")!;

    createButton(categoriesElement, "🎲 Random All", () => randomiseAllCategories());
    createButton(categoriesElement, "✖ Reset All", () => resetAllCategories());
    createButton(categoriesElement, "🎹 Note Sample", () => playNoteSample());
    createButton(categoriesElement, "⛔ Panic", () => {
        outputChannel.sendAllSoundOff();
        output.sendStop();
    });

    for (const category in synthCategoryCc[selectedDevice!]) {
        const categoryElement = createElement(categoriesElement, "div", "category");

        const categoryTitle = createElement(categoryElement, "h2", undefined, category);

        if (!categoryNotRandom.includes(category)) {
            createButton(categoryElement, "🎲 Random", () => randomiseCategory(category));
        }

        createButton(categoryElement, "✖ Reset", () => resetCategory(category));

        sliderElements[category] = {};

        for (const ccLabel in synthCategoryCc[selectedDevice!][category]) {
            const cc = synthCategoryCc[selectedDevice!][category][ccLabel];

            const ccElement = createElement(categoryElement, "div", "cc");

            const initialValue = getDefaultValue(category, ccLabel)
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

    playNoteSample(false, true);
}

function createElement(parentElement: HTMLElement, tag: string, className?: string, textContent?: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    parentElement.appendChild(element);
    return element;
}

function createButton(parentElement: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClick;
    parentElement.appendChild(button);
    return button;
}

function createSlider(parentElement: HTMLElement, min: number, max: number, value: number, onChange: (value: string) => void): HTMLInputElement {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = "1";
    slider.oninput = (e) => {
        const target = e.target as HTMLInputElement;
        onChange(target.value);
    };
    parentElement.appendChild(slider)
    return slider;
}

function sendCc(cc: number, value: number) {
    outputChannel.sendControlChange(cc, value);
}

function randomiseCategory(category: string) {
    const ccList = synthCategoryCc[selectedDevice!][category];
    for (const ccLabel in ccList) {
        const cc = ccList[ccLabel];
        const value = Math.floor(Math.random() * (MIDI_CC_MAX + 1));
        sendCc(cc, value);
        updateUiCc(category, ccLabel, value);
    }
    playNoteSample();
}

function randomiseAllCategories() {
    for (const category in synthCategoryCc[selectedDevice!]) {
        if (!categoryNotRandom.includes(category)) {
            randomiseCategory(category);
        }
    }
}

function resetCategory(category: string) {
    const ccList = synthCategoryCc[selectedDevice!][category];
    for (const ccLabel in ccList) {
        const cc = ccList[ccLabel];
        const value = getDefaultValue(category, ccLabel)
        sendCc(cc, value);
        updateUiCc(category, ccLabel, value);
    }
    playNoteSample();
}

function getDefaultValue(category: string, ccLabel: string): number {
    if (differentDefaults[selectedDevice!] &&
        differentDefaults[selectedDevice!][category] &&
        differentDefaults[selectedDevice!][category][ccLabel] !== undefined) {
        return differentDefaults[selectedDevice!][category][ccLabel];
    } else {
        return 0;
    }
}

function resetAllCategories() {
    for (const category in synthCategoryCc[selectedDevice!]) {
        resetCategory(category);
    }
}

function receiveCc(command: number, value: number) {
    try {
        const [category, label] = Object.entries(synthCategoryCc[selectedDevice!]).flatMap(([category, ccs]) =>
            Object.entries(ccs).filter(([ccLabel, cc]) => cc === command).map(([ccLabel, cc]) => [category, ccLabel])
        )[0];
        updateUiCc(category, label, value);
    } catch (error) {
        console.log("Received CC not in config:", command);
        return;
    }
}

function updateUiCc(category: string, label: string, value: number) {
    sliderElements[category][label].value = value.toString();
    updateUiCcValueLabel(category, label, value.toString());
}

function updateUiCcValueLabel(category: string, label: string, value: string) {
    const ccLabelElement = sliderElements[category][label].nextSibling as HTMLSpanElement;
    ccLabelElement.innerText = value;
}

function playNoteSample(octaves = true, hold = true) {
    const shortDuration = 100;
    const longDuration = 500;
    const nOctaves = 6
    if (octaves) {
        for (let i = 0; i < 6; i++) {
            outputChannel.playNote(`C${i + 1}`, { duration: shortDuration, time: `+${i * shortDuration}` });
        }
    }
    if (hold) {
        outputChannel.playNote("C4", { duration: longDuration, time: `+${nOctaves * shortDuration}` });
    }
}

// NTS-1 specific
// based on https://github.com/oscarrc/nts-web/blob/master/src/hooks/useNTS.jsx
const sysex = {
    vendor: 66,
    channel: 0,
    device: 87,
};

const defaultControls = {};

const decode = (data: number[]): string => {
    let nameBytes = data.slice(30, data.length - 1);
    let decodedString = "";
    nameBytes.forEach(byte => {
        if (byte) {
            decodedString = decodedString + String.fromCharCode(byte);
        }
    });
    return decodedString.replace(/[^a-zA-Z0-9 -]/g, "");
}

const getNts1PluginNames = async (input: any, output: any): Promise<any> => {
    let type = 1;
    let bank = 0;
    let controls: any = JSON.parse(JSON.stringify(defaultControls));
    const index = [88, 89, 90, 53];

    if (!input || !output) {
        console.error("MIDI devices not available.");
        return defaultControls;
    }

    const get = (e: any) => {
        if (e.data.length === 53) {
            const decoded = decode(e.data);
            const controlIndex = index[type - 1];
            if (!controls[controlIndex]) {
                controls[controlIndex] = { options: [] };
            }
            if (!controls[controlIndex].options.includes(decoded)) {
                controls[controlIndex].options.push(decoded);
            }
        }

        // request next plugin name, at the next bank within the same type or in the next type
        if (bank < 16) {
            bank++;
            output.sendSysex(sysex.vendor, [48 + sysex.channel, 0, 1, sysex.device, 25, type, bank]);
        } else if (type < 4) {
            bank = 0;
            type++;
            output.sendSysex(sysex.vendor, [48 + sysex.channel, 0, 1, sysex.device, 25, type, bank]);
        } else {
            input.removeListener("sysex", get);
            console.log("Labels fetched:", controls);
        }
    };

    // make sure we can receive the sysex messages that contain the plugin names
    input.addListener("sysex", get);

    // get the NTS-1 to send us sysex messages
    // either sysex messages seems to do the trick, it's not needed to send both
    output.sendSysex(sysex.vendor, [80, 0, 2]);
    output.sendSysex(sysex.vendor, [48 + sysex.channel, 0, 1, sysex.device, 25, type, bank]);

    return new Promise(resolve => {
        const checkDone = setInterval(() => {
            if (type > 4) {
                clearInterval(checkDone);
                resolve(controls);
            }
        }, 1000);
    });
};