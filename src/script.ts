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
}

function selectDevices() {
    const inputs = WebMidi.inputs;
    const outputs = WebMidi.outputs;

    const inputSelector = document.getElementById("midi-in") as HTMLSelectElement;
    for (var i = 0; i < inputs.length; i++) {
        const option = document.createElement("option");
        option.value = inputs[i].id;
        option.text = `${inputs[i].name} (id: ${inputs[i].id})`;
        inputSelector.appendChild(option);
    }

    const outputSelector = document.getElementById("midi-out") as HTMLSelectElement;
    for (var i = 0; i < outputs.length; i++) {
        const option = document.createElement("option");
        option.value = outputs[i].id;
        option.text = `${outputs[i].name} (id: ${outputs[i].id})`;
        outputSelector.appendChild(option);
    }

    var chosenInput = -1;
    var chosenOutput = -1;

    // look for both input and output of one of the expected devices
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
                input.addListener("controlchange", (e: any) => {
                    receiveCc(e.dataBytes[0], e.dataBytes[1]);
                });

                output = outputs[chosenOutput];
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

                // update midi in out selectors
                inputSelector.value = input.id;
                updateSelectedOptionLabel(inputSelector, input.id);
                outputSelector.value = output.id;
                updateSelectedOptionLabel(outputSelector, output.id);

                // only select 1 device (for now)
                return
            }
        }
    }

    if (selectedDevice === null) {
        // changing midi in/out is only supported when a device has been found
        document.getElementById("changeMidiInOut").style.display = "none";

        let alertString = "No known device found. Please connect one of the following supported devices:\n";
        devices.forEach((device) => {
            alertString += `- ${device["name"]}\n`;
        });
        alert(alertString);
        return;
    }
}

function updateSelectedOptionLabel(selectElement: HTMLSelectElement, selectedId: string) {
    for (var i = 0; i < selectElement.children.length; i++) {
        const option = selectElement.children[i] as HTMLOptionElement;
        if (option.value == selectedId) {
            if (!option.innerHTML.includes(" - selected")) {
                option.innerHTML += " - selected";
            }
        } else if (option.innerHTML.includes(" - selected")) {
            option.innerHTML = option.innerHTML.replace(" - selected", "");
        }
    }
}

function changeMidiInOut() {
    const inputSelector = document.getElementById("midi-in") as HTMLSelectElement;
    const outputSelector = document.getElementById("midi-out") as HTMLSelectElement;

    const newInputId = inputSelector.value;
    const newOutputId = outputSelector.value;

    input = WebMidi.getInputById(newInputId);
    output = WebMidi.getOutputById(newOutputId);

    input.addListener("controlchange", (e: any) => {
        receiveCc(e.dataBytes[0], e.dataBytes[1]);
    });

    outputChannel = output.channels[1];

    updateSelectedOptionLabel(inputSelector, newInputId);
    updateSelectedOptionLabel(outputSelector, newOutputId);
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

            updateUiCcValueLabel(cc, category, ccLabel, initialValue);
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

function playNoteSample() {
    const noteDuration = 200;
    const waitDuration = 200;
    const nOctaves = 2;
    const octaveInterval = 3;

    for (let i = 0; i < nOctaves; i++) {
        const note = `C${(i * octaveInterval) + 1}`
        const time = `+${i * (noteDuration + waitDuration)}`;
        outputChannel.playNote(note, { duration: noteDuration, time: time });
    }

}

class RangeTranslator {
    translate(cc: number, value: number): string {
        return value.toString();
    }
}

class Nts1RangeTranslator extends RangeTranslator {
    labeled = {};

    async getRangeLabels(): Promise<void> {
        const nts1Fetcher = new Nts1PluginFetcher();
        this.labeled = await nts1Fetcher.fetchPluginNames(input, output);
    }

    translate(cc: number, value: number): string {
        if (this.labeled[cc]) {
            const labels = this.labeled[cc];

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

function mapFrequency(value: number, minFreq: number, maxFreq: number): string {
    const scaled = minFreq + value / 127 * (maxFreq - minFreq);
    const rounded = Math.round(scaled * 10) / 10;
    return `${rounded} Hz`;
}

function mapUnipolar(value: number, minOutput: number, maxOutput: number, label: string): string {
    const scaled = minOutput + value / 127 * (maxOutput - minOutput);
    const rounded = Math.round(scaled);
    return ` ${label} ${rounded}`;
}

function mapBipolar(value: number, maxOutput: number, negativeLabel: string, positiveLabel: string): string {
    const shifted = value - 64;
    const scaled = Math.abs(shifted) / 64 * maxOutput;
    const rounded = Math.round(scaled);
    if (shifted > 0) {
        return ` ${positiveLabel} ${rounded}`;
    } else if (shifted < 0) {
        return ` ${negativeLabel} ${rounded}`;
    } else {
        return "0";
    }
}

class Nts1Mk2RangeTranslator extends RangeTranslator {
    labeled = {};
    mapped = {
        // OSC LFO Rate
        24: function (value: number): string {
            return mapFrequency(value, 0, 30);
        },
        // Osc LFO Depth
        26: function (value: number): string {
            return mapBipolar(value, 100, "Pitch", "Shape");
        },
        // Filter Sweep Rate
        46: function (value: number): string {
            return mapFrequency(value, 0, 30);
        },
        // Filter Sweep Depth
        45: function (value: number): string {
            return mapBipolar(value, 100, "Up", "Down");
        },
        // EG Tremolo Rate
        21: function (value: number): string {
            return mapFrequency(value, 0, 60);
        },
        // EG Tremolo Depth
        20: function (value: number): string {
            return mapUnipolar(value, 0, 100, "Depth");
        },
        // Delay Mix
        33: function (value: number): string {
            return mapBipolar(value, 100, "Dry", "Wet");
        },
        // Reverb Mix
        36: function (value: number): string {
            return mapBipolar(value, 100, "Dry", "Wet");
        },
        // Arp Length
        119: function (value: number): string {
            return mapUnipolar(value, 1, 24, "Steps");
        }
    }

    async getRangeLabels(): Promise<void> {
        const nts1Fetcher = new Nts1Mk2PluginFetcher();
        this.labeled = await nts1Fetcher.fetchPluginNames(input, output);
    }

    translate(cc: number, value: number): string {
        console.log("translating", cc, value);
        if (this.labeled[cc]) {
            const labels = this.labeled[cc];

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
        } else if (this.mapped[cc]) {
            return `${value} ≈ ${this.mapped[cc](value)}`;
        } else {
            return value.toString();
        }
    }
}