"use client";
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HrisOperationalTimeRequestPanel", {
    enumerable: true,
    get: function() {
        return HrisOperationalTimeRequestPanel;
    }
});
var _jsxruntime = require("react/jsx-runtime");
var _react = require("react");
var _operationaltimeactions = require("@/actions/hris/operational-time.actions");
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _object_spread_props(target, source) {
    source = source != null ? source : {};
    if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
        ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
function _ts_generator(thisArg, body) {
    var f, y, t, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    }, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype), d = Object.defineProperty;
    return d(g, "next", {
        value: verb(0)
    }), d(g, "throw", {
        value: verb(1)
    }), d(g, "return", {
        value: verb(2)
    }), typeof Symbol === "function" && d(g, Symbol.iterator, {
        value: function() {
            return this;
        }
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(g && (g = 0, op[0] && (_ = 0)), _)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
var inputClass = "mt-1 min-h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white";
function digest(value) {
    return _async_to_generator(function() {
        var result;
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
                    ];
                case 1:
                    result = _state.sent();
                    return [
                        2,
                        "sha256:".concat(Array.from(new Uint8Array(result)).map(function(byte) {
                            return byte.toString(16).padStart(2, "0");
                        }).join(""))
                    ];
            }
        });
    })();
}
function HrisOperationalTimeRequestPanel(param) {
    var requests = param.requests, balances = param.balances, _param_correctionEntries = param.correctionEntries, correctionEntries = _param_correctionEntries === void 0 ? [] : _param_correctionEntries, enabled = param.enabled, _param_locale = param.locale, locale = _param_locale === void 0 ? "en" : _param_locale;
    var _useTransition = _sliced_to_array((0, _react.useTransition)(), 2), pending = _useTransition[0], startTransition = _useTransition[1];
    var _useState = _sliced_to_array((0, _react.useState)(null), 2), message = _useState[0], setMessage = _useState[1];
    var _useState1 = _sliced_to_array((0, _react.useState)(false), 2), failed = _useState1[0], setFailed = _useState1[1];
    var _useState2 = _sliced_to_array((0, _react.useState)("LEAVE"), 2), type = _useState2[0], setType = _useState2[1];
    var _useState3 = _sliced_to_array((0, _react.useState)(""), 2), entryId = _useState3[0], setEntryId = _useState3[1];
    var messageRef = (0, _react.useRef)(null);
    (0, _react.useEffect)(function() {
        var _messageRef_current;
        if (failed && message) (_messageRef_current = messageRef.current) === null || _messageRef_current === void 0 ? void 0 : _messageRef_current.focus();
    }, [
        failed,
        message
    ]);
    var fr = locale.startsWith("fr");
    var text = function text(en, french) {
        return fr ? french : en;
    };
    var selected = correctionEntries.find(function(entry) {
        return entry.id === entryId;
    });
    var correction = type === "ATTENDANCE_CORRECTION";
    var typeLabel = function typeLabel(value) {
        return value === "LEAVE" ? text("Leave", "Congé") : value === "OVERTIME" ? text("Overtime", "Heures supplémentaires") : text("Attendance correction", "Correction de présence");
    };
    var statusLabel = function statusLabel(value) {
        var _value;
        return (_value = ({
            REQUESTED: text("Awaiting review", "En attente de validation"),
            APPROVED: text("Approved", "Approuvée"),
            REJECTED: text("Rejected", "Refusée")
        })[value]) !== null && _value !== void 0 ? _value : value;
    };
    function submit(formData) {
        startTransition(function() {
            return _async_to_generator(function() {
                var _formData_get, _formData_get1, _formData_get2, _balances_, periodStart, periodEnd, proposedWorkedMinutes, proposedAbsenceMinutes, requestedMinutes, payload, evidence, result, unused;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            setMessage(null);
                            setFailed(false);
                            _state.label = 1;
                        case 1:
                            _state.trys.push([
                                1,
                                4,
                                ,
                                5
                            ]);
                            if (correction && !selected) throw new Error("missing entry");
                            periodStart = correction ? selected.workDate : String((_formData_get = formData.get("periodStart")) !== null && _formData_get !== void 0 ? _formData_get : "");
                            periodEnd = correction ? selected.workDate : String((_formData_get1 = formData.get("periodEnd")) !== null && _formData_get1 !== void 0 ? _formData_get1 : "");
                            proposedWorkedMinutes = correction ? Number(formData.get("proposedWorkedMinutes")) : undefined;
                            proposedAbsenceMinutes = correction ? Number(formData.get("proposedAbsenceMinutes")) : undefined;
                            requestedMinutes = correction ? Math.max(1, proposedWorkedMinutes + proposedAbsenceMinutes) : Number(formData.get("requestedMinutes"));
                            payload = {
                                type: type,
                                periodStart: periodStart,
                                periodEnd: periodEnd,
                                requestedMinutes: requestedMinutes,
                                reason: String((_formData_get2 = formData.get("reason")) !== null && _formData_get2 !== void 0 ? _formData_get2 : ""),
                                leavePolicyId: type === "LEAVE" ? (_balances_ = balances[0]) === null || _balances_ === void 0 ? void 0 : _balances_.leavePolicyId : undefined,
                                targetTimeEntryId: correction ? selected.id : undefined,
                                expectedEntryHash: correction ? selected.sourceHash : undefined,
                                proposedWorkedMinutes: proposedWorkedMinutes,
                                proposedAbsenceMinutes: proposedAbsenceMinutes
                            };
                            return [
                                4,
                                digest(JSON.stringify(payload))
                            ];
                        case 2:
                            evidence = _state.sent();
                            return [
                                4,
                                (0, _operationaltimeactions.requestOperationalTimeAction)(_object_spread_props(_object_spread({}, payload), {
                                    requestEvidenceHash: evidence,
                                    idempotencyKey: "time-request:".concat(evidence)
                                }))
                            ];
                        case 3:
                            result = _state.sent();
                            setFailed(!result.success);
                            setMessage(result.success ? text("Request submitted for independent review.", "Demande transmise pour validation indépendante.") : result.error);
                            return [
                                3,
                                5
                            ];
                        case 4:
                            unused = _state.sent();
                            setFailed(true);
                            setMessage(text("The request could not be confirmed. Your entries are retained; retry or refresh the selected source if it changed.", "La demande n’a pas pu être confirmée. Vos valeurs sont conservées ; réessayez ou actualisez la source si elle a changé."));
                            return [
                                3,
                                5
                            ];
                        case 5:
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    }
    return /*#__PURE__*/ (0, _jsxruntime.jsxs)("section", {
        "aria-labelledby": "operational-time-heading",
        className: "border-t border-white/10 pt-4",
        children: [
            /*#__PURE__*/ (0, _jsxruntime.jsx)("h2", {
                id: "operational-time-heading",
                className: "text-base font-semibold text-white",
                children: text("Leave, overtime and attendance corrections", "Congés, heures supplémentaires et corrections de présence")
            }),
            message ? /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                ref: messageRef,
                tabIndex: -1,
                role: failed ? "alert" : "status",
                className: "mt-3 text-sm text-sky-200",
                children: message
            }) : null,
            enabled ? /*#__PURE__*/ (0, _jsxruntime.jsxs)("form", {
                onSubmit: function onSubmit(event) {
                    event.preventDefault();
                    submit(new FormData(event.currentTarget));
                },
                "aria-busy": pending,
                className: "mt-4 grid gap-3 md:grid-cols-2",
                children: [
                    /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                        className: "text-sm text-slate-300",
                        children: [
                            text("Request type", "Type de demande"),
                            /*#__PURE__*/ (0, _jsxruntime.jsx)("select", {
                                value: type,
                                onChange: function onChange(event) {
                                    return setType(event.target.value);
                                },
                                className: inputClass,
                                disabled: pending,
                                children: [
                                    "LEAVE",
                                    "OVERTIME",
                                    "ATTENDANCE_CORRECTION"
                                ].map(function(value) {
                                    return /*#__PURE__*/ (0, _jsxruntime.jsx)("option", {
                                        value: value,
                                        children: typeLabel(value)
                                    }, value);
                                })
                            })
                        ]
                    }),
                    correction ? /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
                        children: [
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                                className: "text-sm text-slate-300",
                                children: [
                                    text("Imported work entry", "Présence importée"),
                                    /*#__PURE__*/ (0, _jsxruntime.jsxs)("select", {
                                        value: entryId,
                                        onChange: function onChange(event) {
                                            return setEntryId(event.target.value);
                                        },
                                        className: inputClass,
                                        required: true,
                                        disabled: pending,
                                        children: [
                                            /*#__PURE__*/ (0, _jsxruntime.jsx)("option", {
                                                value: "",
                                                children: text("Select an entry", "Sélectionner une présence")
                                            }),
                                            correctionEntries.map(function(entry) {
                                                return /*#__PURE__*/ (0, _jsxruntime.jsxs)("option", {
                                                    value: entry.id,
                                                    children: [
                                                        entry.workDate.slice(0, 10),
                                                        " — ",
                                                        entry.workedMinutes,
                                                        " / ",
                                                        entry.scheduledMinutes,
                                                        " min"
                                                    ]
                                                }, entry.id);
                                            })
                                        ]
                                    })
                                ]
                            }),
                            selected ? /*#__PURE__*/ (0, _jsxruntime.jsxs)("p", {
                                className: "text-sm text-slate-300 md:col-span-2",
                                children: [
                                    text("Current worked / absence minutes:", "Minutes actuelles travaillées / absentes :"),
                                    " ",
                                    selected.workedMinutes,
                                    " / ",
                                    selected.absenceMinutes
                                ]
                            }) : /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                                className: "text-sm text-amber-200 md:col-span-2",
                                children: text("Choose a validated entry to review its current values.", "Choisissez une présence validée pour consulter ses valeurs actuelles.")
                            }),
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                                className: "text-sm text-slate-300",
                                children: [
                                    text("Corrected worked minutes", "Minutes travaillées corrigées"),
                                    /*#__PURE__*/ (0, _jsxruntime.jsx)("input", {
                                        defaultValue: selected === null || selected === void 0 ? void 0 : selected.workedMinutes,
                                        name: "proposedWorkedMinutes",
                                        type: "number",
                                        min: "0",
                                        step: "1",
                                        required: true,
                                        disabled: pending,
                                        className: inputClass
                                    }, entryId + "-worked")
                                ]
                            }),
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                                className: "text-sm text-slate-300",
                                children: [
                                    text("Corrected absence minutes", "Minutes d’absence corrigées"),
                                    /*#__PURE__*/ (0, _jsxruntime.jsx)("input", {
                                        defaultValue: selected === null || selected === void 0 ? void 0 : selected.absenceMinutes,
                                        name: "proposedAbsenceMinutes",
                                        type: "number",
                                        min: "0",
                                        step: "1",
                                        required: true,
                                        disabled: pending,
                                        className: inputClass
                                    }, entryId + "-absence")
                                ]
                            })
                        ]
                    }) : /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
                        children: [
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                                className: "text-sm text-slate-300",
                                children: [
                                    text("Minutes", "Minutes"),
                                    /*#__PURE__*/ (0, _jsxruntime.jsx)("input", {
                                        name: "requestedMinutes",
                                        type: "number",
                                        min: "1",
                                        required: true,
                                        disabled: pending,
                                        className: inputClass
                                    })
                                ]
                            }),
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                                className: "text-sm text-slate-300",
                                children: [
                                    text("Start", "Début"),
                                    /*#__PURE__*/ (0, _jsxruntime.jsx)("input", {
                                        name: "periodStart",
                                        type: "date",
                                        required: true,
                                        disabled: pending,
                                        className: inputClass
                                    })
                                ]
                            }),
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                                className: "text-sm text-slate-300",
                                children: [
                                    text("End", "Fin"),
                                    /*#__PURE__*/ (0, _jsxruntime.jsx)("input", {
                                        name: "periodEnd",
                                        type: "date",
                                        required: true,
                                        disabled: pending,
                                        className: inputClass
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, _jsxruntime.jsxs)("label", {
                        className: "text-sm text-slate-300 md:col-span-2",
                        children: [
                            text("Reason", "Motif"),
                            /*#__PURE__*/ (0, _jsxruntime.jsx)("textarea", {
                                name: "reason",
                                minLength: 8,
                                required: true,
                                disabled: pending,
                                className: "mt-1 min-h-24 w-full rounded-md border border-white/10 bg-slate-950 p-3 text-white"
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, _jsxruntime.jsx)("button", {
                        type: "submit",
                        disabled: pending || type === "LEAVE" && balances.length === 0 || correction && !selected,
                        className: "min-h-11 rounded-md bg-emerald-500 px-4 font-medium text-slate-950 disabled:opacity-50 md:col-span-2",
                        children: pending ? text("Submitting…", "Envoi…") : text("Submit request", "Envoyer la demande")
                    })
                ]
            }) : /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                className: "mt-3 text-sm text-amber-200",
                children: text("Request permission is required.", "L’autorisation de demande est requise.")
            }),
            /*#__PURE__*/ (0, _jsxruntime.jsx)("div", {
                className: "mt-5 divide-y divide-white/10 border-y border-white/10",
                children: requests.length ? requests.map(function(request) {
                    return /*#__PURE__*/ (0, _jsxruntime.jsxs)("div", {
                        className: "flex flex-wrap justify-between gap-3 py-3 text-sm",
                        children: [
                            /*#__PURE__*/ (0, _jsxruntime.jsx)("span", {
                                className: "text-white",
                                children: typeLabel(request.type)
                            }),
                            /*#__PURE__*/ (0, _jsxruntime.jsxs)("span", {
                                className: "text-slate-300",
                                children: [
                                    request.requestedMinutes,
                                    " minutes"
                                ]
                            }),
                            /*#__PURE__*/ (0, _jsxruntime.jsx)("span", {
                                className: "text-slate-300",
                                children: statusLabel(request.status)
                            })
                        ]
                    }, request.id);
                }) : /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                    className: "py-4 text-sm text-slate-400",
                    children: text("No time requests yet.", "Aucune demande pour le moment.")
                })
            })
        ]
    });
}
