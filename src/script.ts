declare const WebMidi: any;

const MIDI_CC_MIN = 0;
const MIDI_CC_MAX = 127;

// state
let selectedDevice: string | null = null;
let sliderElements: Record<string, Record<string, HTMLInputElement>> = {};
let output: any;
let outputChannel: any;

WebMidi
    .enable()
    .then(onEnabled)
    .catch((err: any) => alert(err));

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
            document.getElementById("title")!.innerText = selectedDevice;
        }
    }

    if (selectedDevice === null) {
        let alertString = "No known device found. Please connect one of the following supported devices (input, output):\n";
        for (const device in devices) {
            alertString += `- ${device} (${devices[device]["in"]}, ${devices[device]["out"]})\n`;
        }
        alertString += "Connected input devices:\n";
        WebMidi.inputs.forEach((device: any, index: number) => {
            alertString += `- ${device.name}\n`;
        });
        alertString += "Connected output devices:\n";
        WebMidi.outputs.forEach((device: any, index: number) => {
            alertString += `- ${device.name}\n`;
        });
        alert(alertString);
        return;
    }

    const input = WebMidi.getInputByName(devices[selectedDevice]["in"]);
    input.addListener("controlchange", (e: any) => {
        receiveCc(e.dataBytes[0], e.dataBytes[1]);
    })

    output = WebMidi.getOutputByName(devices[selectedDevice]["out"]);
    outputChannel = output.channels[1];
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

    playNoteSample();
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