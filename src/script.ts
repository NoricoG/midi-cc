declare const WebMidi: any;

const MIDI_CC_MIN = 0;
const MIDI_CC_MAX = 127;

// state
let selectedDevice: string | null = null;
let sliderElements: Record<string, Record<string, HTMLInputElement>> = {};
let input: any = null;
let output: any = null;
let outputChannel: any = null;
let rangeTranslator: any = null;

WebMidi
    .enable({ sysex: true })
    .then(onEnabled)
    .catch((err: Error) => {
        console.log(err.stack ? err.stack : err.message);
        alert(err.stack ? err.stack : err.message);
    });

function onEnabled() {
    selectDevices();
    if (selectedDevice !== null) {
        createUi();
    }
    showMidiDebugInfo();
}


function selectDevices() {
    const inputs = WebMidi.inputs;
    const outputs = WebMidi.outputs;

    var chosenInput = -1;
    var chosenOutput = -1;

    for (const device of devices) {
        for (const inOut of device["inOut"]) {
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].name === inOut[0]) {
                    chosenInput = i;
                    break;
                }
            }
            for (var i = 0; i < outputs.length; i++) {
                if (outputs[i].name === inOut[1]) {
                    chosenOutput = i;
                    break;
                }
            }

            if (chosenInput !== -1 && chosenOutput !== -1) {
                input = inputs[chosenInput];
                console.log("input", input.name)
                input.addListener("controlchange", (e: any) => {
                    receiveCc(e.dataBytes[0], e.dataBytes[1]);
                });

                output = outputs[chosenOutput];
                console.log("output", output.name)
                outputChannel = output.channels[1];

                selectedDevice = device["name"];
                document.getElementById("title")!.innerText = selectedDevice;

                if (selectedDevice === "NTS-1") {
                    rangeTranslator = new Nts1RangeTranslator();
                    const getRangeLabelsPromise = rangeTranslator.getRangeLabels();
                    getRangeLabelsPromise.then(() => {
                        // TODO: update all existing UI elements with retrieved labels
                    });
                } else if (selectedDevice === "NTS-1 MK2") {
                    rangeTranslator = new Nts1Mk2RangeTranslator();
                    const getRangeLabelsPromise = rangeTranslator.getRangeLabels();
                    getRangeLabelsPromise.then(() => {
                        // TODO: update all existing UI elements with retrieved labels
                    });
                } else {
                    rangeTranslator = new RangeTranslator();
                }
                // only select 1 device (for now)
                return
            }
        }
    }

    if (selectedDevice === null) {
        let alertString = "No known device found. Please connect one of the following supported devices:\n";
        devices.forEach((device) => {
            alertString += `- ${device["name"]}\n`;
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
                const parsedValue = parseInt(value);
                sendCc(cc, parsedValue);
                updateUiCcValueLabel(cc, category, ccLabel, parsedValue);
            });

            sliderElements[category][ccLabel] = ccSlider;

            createElement(ccElement, "span", undefined, ccLabel + ": ");

            const ccValue = createElement(ccElement, "span", undefined, "0");
            ccValue.style.width = "4ch";
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

function showMidiDebugInfo() {
    const inputs = WebMidi.inputs;
    const outputs = WebMidi.outputs;

    const midiDebugElement = document.getElementById("midi-debug");

    for (var i = 0; i < inputs.length; i++) {
        var label = `MIDI Input ${i}: ${inputs[i].name} (id: ${inputs[i].id})`;
        if ("sysex" in inputs[i].eventMap) {
            label += " with sysex eventMap";
        }
        const inputElement = createElement(midiDebugElement!, "p", "midi-in", label);
    }

    for (var i = 0; i < outputs.length; i++) {
        var label = `MIDI Output ${i}: ${outputs[i].name} (id: ${outputs[i].id})`;
        const outputElement = createElement(midiDebugElement!, "p", "midi-out", label);
    }

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
        updateUiCc(cc, category, ccLabel, value);
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
        updateUiCc(cc, category, ccLabel, value);
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
        updateUiCc(command, category, label, value);
    } catch (error) {
        console.log("Received CC not in config:", command);
        return;
    }
}

function updateUiCc(command: number, category: string, label: string, value: number) {
    sliderElements[category][label].value = value.toString();
    updateUiCcValueLabel(command, category, label, value);
}

function updateUiCcValueLabel(command: number, category: string, label: string, value: number) {
    const ccLabelElement = sliderElements[category][label].nextSibling.nextSibling as HTMLSpanElement;
    ccLabelElement.innerText = rangeTranslator.translate(command, value);
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

class RangeTranslator {
    translate(cc: number, value: number): string {
        return value.toString();
    }
}

class Nts1RangeTranslator extends RangeTranslator {
    controls = {};

    async getRangeLabels(): Promise<void> {
        const nts1Fetcher = new Nts1PluginFetcher();
        this.controls = await nts1Fetcher.fetchPluginNames(input, output);
    }

    translate(cc: number, value: number): string {
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
        } else {
            return value.toString();
        }
    }
}


class Nts1Mk2RangeTranslator extends RangeTranslator {
    controls = {};

    async getRangeLabels(): Promise<void> {
        const nts1Fetcher = new Nts1Mk2PluginFetcher();
        this.controls = await nts1Fetcher.fetchPluginNames(input, output);
    }

    translate(cc: number, value: number): string {
        console.log("translating", cc, value);
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
        } else {
            return value.toString();
        }
    }
}