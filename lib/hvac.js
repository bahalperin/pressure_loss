HVAC = {};

HVAC.calculateProperties = {
    "ductRound": function(args) {
        check(args, Match.ObjectIncluding({
            inlet: Object,
            length: Number
        }));
        args.inlet = HVAC.connectionRound(args.inlet);
        args.pressureLoss = args.inlet.linearPressureLoss * args.length;

        return args;
    },
    "ductRectangular": function(args) {
        check(args, Match.ObjectIncluding({
            inlet: Object,
            length: Number
        }));
        args.inlet = HVAC.connectionRectangular(args.inlet);
        args.pressureLoss = args.inlet.linearPressureLoss * args.length;
        return args;
    },
    "elbowRoundSmooth": function(args) {
        check(args, Match.ObjectIncluding({
            inlet: Object,
            bendRadius: Number,
            table: [Object]
        }));
        args.inlet = HVAC.connectionRound(args.inlet);
        args.bendRatio = args.bendRadius / args.inlet.diameter;
        args.lossCoefficient = HVAC.tableLookup({
            table: args.table,
            lookupColumns: [{"name": "bendRatio", "value": args.bendRatio}],
            resultColumn: "lossCoefficient"
        });
        var pressureLossModifierTable = [
            {"bendAngle": 0, "pressureLossModifier": 0},
            {"bendAngle": 20, "pressureLossModifier": 0.31},
            {"bendAngle": 30, "pressureLossModifier": 0.45},
            {"bendAngle": 45, "pressureLossModifier": 0.6},
            {"bendAngle": 60, "pressureLossModifier": 0.78},
            {"bendAngle": 75, "pressureLossModifier": 0.9},
            {"bendAngle": 90, "pressureLossModifier": 1.0},
            {"bendAngle": 110, "pressureLossModifier": 1.13},
            {"bendAngle": 130, "pressureLossModifier": 1.20},
            {"bendAngle": 150, "pressureLossModifier": 1.28},
            {"bendAngle": 180, "pressureLossModifier": 1.40}
        ];
        var pressureLossModifier = HVAC.tableLookup({
            table: pressureLossModifierTable,
            lookupColumns: [{"name": "bendAngle", "value": args.bendAngle}],
            resultColumn: "pressureLossModifier"
        });
        args.pressureLoss = pressureLossModifier * args.lossCoefficient * args.inlet.velocityPressure;
        return args;
    },
    "elbowRoundGored": function(args) {
        check(args, Match.ObjectIncluding({
            inlet: Object,
            bendRadius: Number,
            table: [Object]
        }));
        args.inlet = HVAC.connectionRound(args.inlet);
        args.bendRatio = args.bendRadius / args.inlet.diameter;
        args.lossCoefficient = HVAC.tableLookup({
            table: args.table,
            lookupColumns: [
                {"name": "bendRatio", "value": args.bendRatio},
                {"name": "numberOfPieces", "value": args.numberOfPieces}
            ],
            resultColumn: "lossCoefficient"
        });
        args.pressureLoss = args.lossCoefficient * args.inlet.velocityPressure;

        return args;
    },
    "elbowRoundMitered": function(args) {
        check(args, Match.ObjectIncluding({
            inlet: Object,
            bendAngle: Number,
            table: [Object]
        }));
        args.inlet = HVAC.connectionRound(args.inlet);
        args.lossCoefficient = HVAC.tableLookup({
            table: args.table,
            lookupColumns: [
                {"name": "bendAngle", "value": args.bendAngle},
            ],
            resultColumn: "lossCoefficient"
        });
        args.pressureLoss = args.lossCoefficient * args.inlet.velocityPressure;

        return args;
    }
}
HVAC.validateConnection = function(connection) {
    if (connection.diameter && (connection.width || connection.height)) {
        return false;
    }
    if ((connection.width && (! connection.height)) || (connection.height && (! connection.width))) {
        return false;
    }
    if (! connection.diameter && (! connection.width || ! connection.height)) {
        return false;
    }
    if (! connection.flowrate) {
        return false;
    }
    return true;
}
HVAC.connectionRound = function(args) {
    check(args, Object);
    var connection = _.omit(args, "width", "height");

    connection.area = Math.PI * Math.pow(connection.diameter / 2, 2) / 144;
    connection.velocity = connection.flowrate / connection.area;
    connection.velocityPressure = Math.pow(connection.velocity / 4005, 2);
    connection.linearPressureLoss = 0.109136 * Math.pow(connection.flowrate, 1.9) / Math.pow(connection.diameter, 5.02) / 100;

    return connection;
}
HVAC.connectionRectangular = function(args) {
    check(args, Object);
    var connection = _.omit(args, "diameter");

    connection.area = connection.width * connection.height / 144;
    connection.velocity = connection.flowrate / connection.area;
    connection.velocityPressure = Math.pow(connection.velocity / 4005, 2);
    connection.hydraulicDiameter = 1.3 * Math.pow(connection.width * connection.height, 0.625) / Math.pow(connection.width + connection.height, 0.25);
    connection.linearPressureLoss = 0.109136 * Math.pow(connection.flowrate, 1.9) / Math.pow(connection.hydraulicDiameter, 5.02) / 100;

    return connection;
}

HVAC.tableLookup = function(args) {
    check(args, {
        table: [Object],
        lookupColumns: [Object],
        resultColumn: String
    });
    var table = args.table;
    var columns = args.lookupColumns;
    var desiredResult = args.resultColumn;
    var newColumns = [];
    columns.forEach(function(column) {
        var values = _.pluck(table, column.name);
        newColumnValue = _.reduce(values, function(memo, value) {
            if ((Math.abs(column.value - value)) < (Math.abs(column.value - memo))) {
                return value;
            }
            return memo;
        });
        newColumns.push({name: column.name, value: newColumnValue});
        table = _.filter(table, function(row) { return row[column.name] === newColumnValue });
    });

    table = args.table;
    newColumns.forEach(function(column) {
        table = _.filter(table, function(row) { return row[column.name] === column.value });
    });

    if (table.length !== 1) {
        throw new Error("Lookup didn't work.  Something's wrong...");
    }

    var result = table[0][desiredResult];
    return result
}

HVAC.transform = function(args) {
    check(args, {
        duct: Object,
        ductType: Object
    });
    var duct = args.duct;
    var ductType = args.ductType;

    var ductID = duct._id;
    duct._id = ductID;
    ductType = _.omit(ductType, "_id");
    _.extend(duct, ductType);
    duct = HVAC.calculateProperties[duct.keyword](duct);

    return duct;
}

HVAC.formatProperties = function(duct) {
    var ductKeys = _.keys(duct);
    var inletKeys = _.keys(duct.inlet);
    var filteredDuctKeys = _.filter(ductKeys, function(key) {
        return _.isNumber(duct[key]);
    });
    var formattedProperties = {};
    _.each(filteredDuctKeys, function(key) {
        var value = duct[key];
        if (_.isInteger(value)) {
            formattedProperties[key] = value.toString();
        }
        else {
            formattedProperties[key] = s.numberFormat(value, 2);
        }
    });
    _.each(inletKeys, function(key) {
        var value = duct.inlet[key];
        if (_.isInteger(value)) {
            formattedProperties[key] = value.toString();
        }
        else {
            formattedProperties[key] = s.numberFormat(value, 2);
        }
    });

    return formattedProperties;
}
