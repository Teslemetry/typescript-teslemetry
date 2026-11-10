// Shared editor code for the Command nodes: a command picker filled from the
// API command catalog and one typedInput per field of the selected command.
// Expects #node-input-command, #node-input-command-badge,
// #node-input-command-earlier and #node-input-args-container in the template.
(function () {
    const CONTEXT_TYPES = ["msg", "flow", "global", "env", "jsonata"];
    const TIP_STYLE = { margin: "2px 0 0 105px", "font-size": "0.85em", opacity: 0.7 };

    function readArgs() {
        const args = {};
        $("#node-input-args-container input.teslemetry-arg").each(function () {
            const input = $(this);
            args[input.data("field")] = {
                type: input.typedInput("type"),
                value: input.typedInput("value"),
            };
        });
        return args;
    }

    function hint(field) {
        const parts = [];
        if (field.required) parts.push("required");
        if (field.min !== undefined || field.max !== undefined) {
            parts.push((field.min ?? "") + " to " + (field.max ?? ""));
        }
        if (field.default !== undefined) {
            parts.push("default " + JSON.stringify(field.default));
        }
        return parts.join(", ");
    }

    function fieldTypes(field) {
        if (field.enum) {
            return [{ value: "enum", label: "value", options: field.enum }].concat(CONTEXT_TYPES);
        }
        if (field.type === "number") return ["num"].concat(CONTEXT_TYPES);
        if (field.type === "boolean") return ["bool"].concat(CONTEXT_TYPES);
        if (field.type === "string") return ["str"].concat(CONTEXT_TYPES);
        return ["json"].concat(CONTEXT_TYPES);
    }

    /**
     * Sets up the picker for `node`. Returns `load(query)`, which fetches the
     * catalog for `query` and calls `onLoad(catalog)` once the list is built.
     */
    function setup(node, onLoad) {
        const commandSelect = $("#node-input-command");
        const badge = $("#node-input-command-badge").css(TIP_STYLE);
        const container = $("#node-input-args-container");
        let catalog = {};
        // Field settings survive switching to another command and back.
        const args = { [node.command]: node.args || {} };

        // Earlier names stay listed only when this node is saved with one.
        $("#node-input-command-earlier option")
            .filter(function () {
                return this.value !== node.command;
            })
            .remove();
        if (!$("#node-input-command-earlier option").length) {
            $("#node-input-command-earlier").remove();
        }

        function showFields() {
            const shown = container.data("command");
            if (shown) args[shown] = readArgs();
            const command = commandSelect.val();
            const spec = catalog[command];
            container.empty().removeData("command");
            badge.text(spec && spec.badge ? spec.badge : "");
            if (!spec) return;
            container.data("command", command);
            const saved = args[command] || {};
            spec.fields.forEach(function (field) {
                const row = $('<div class="form-row"></div>');
                $("<label></label>")
                    .text(field.name)
                    .attr("title", field.name + (field.description ? ": " + field.description : ""))
                    .css({ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" })
                    .appendTo(row);
                const input = $('<input type="text" class="teslemetry-arg" style="width: 70%;">')
                    .data("field", field.name)
                    .appendTo(row);
                input.typedInput({ types: fieldTypes(field) });
                const value = saved[field.name] || { type: "msg", value: "payload." + field.name };
                input.typedInput("type", value.type);
                input.typedInput("value", value.value);
                const text = hint(field);
                if (text) $("<div></div>").css(TIP_STYLE).text(text).appendTo(row);
                row.appendTo(container);
            });
        }

        function load(query) {
            $.getJSON("teslemetry/commands", query)
                .done(function (data) {
                    const current = commandSelect.val() || node.command;
                    catalog = {};
                    commandSelect.find("optgroup.teslemetry-catalog").remove();
                    const groups = {};
                    data.forEach(function (spec) {
                        catalog[spec.name] = spec;
                        if (!groups[spec.group]) {
                            groups[spec.group] = $('<optgroup class="teslemetry-catalog"></optgroup>').attr(
                                "label",
                                spec.group,
                            );
                        }
                        $("<option></option>")
                            .val(spec.name)
                            .text(spec.label)
                            .attr("title", spec.name)
                            .appendTo(groups[spec.group]);
                    });
                    Object.values(groups).forEach(function (group) {
                        commandSelect.append(group);
                    });
                    // A saved command missing from this list stays selectable.
                    const listed = commandSelect.find("option").filter(function () {
                        return this.value === current;
                    }).length;
                    if (current && !listed) {
                        $("<option></option>").val(current).text(current).appendTo(commandSelect);
                    }
                    commandSelect.val(current);
                    showFields();
                    if (onLoad) onLoad(catalog);
                })
                .fail(function (jqxhr, textStatus, error) {
                    console.error("Failed to fetch commands", error);
                });
        }

        commandSelect.change(showFields);
        return load;
    }

    /** Stores the fields, only when they were shown for the saved command, so a failed catalog load keeps them. */
    function save(node) {
        if ($("#node-input-args-container").data("command") === $("#node-input-command").val()) {
            node.args = readArgs();
        }
    }

    window.TeslemetryCommandEditor = { setup: setup, save: save };
})();
