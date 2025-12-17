const devices = [
    {
        "name": "NTS-1",
        "inOut": [
            ["NTS-1 digital kit", "NTS-1 digital kit"],
            ["NTS-1 digital kit KBD/KNOB", "NTS-1 digital kit SOUND"]
        ]
    },
    {
        "name": "NTS-1 MK2",
        "inOut": [
            ["NTS-1 digital kit mkII", "NTS-1 digital kit mkII"],
            ["NTS-1 digital kit mkII NTS-1 digital kit _ KBD/KNOB", "NTS-1 digital kit mkII NTS-1 digital kit _ SOUND"],
            // I have seen the following listed but it didn't work
            ["NTS-1 digital kit mkII NTS-1 digital kit _ MIDI IN", "NTS-1 digital kit mkII NTS-1 digital kit _ MIDI OUT"]
        ]
    },
    {
        "name": "MicroFreak",
        "inOut": [
            ["Arturia MicroFreak", "Arturia MicroFreak"]
        ]
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
    // TODO: look at midi implementation to see if more is supported
    "NTS-1 MK2": {
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
            // opposite of NTS-1
            "EG Tremolo Rate": 21,
            "EG Tremolo Depth": 20,
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
    "NTS-1 MK2": {
        "Oscillator": {
            "Type": 8
        },
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