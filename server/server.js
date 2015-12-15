var ductTypes = [
    {
        "class": "duct",
        "shape": "round",
    },
    {
        "class": "duct",
        "shape": "rectangular",
    },
    {
        "class": "elbow",
        "shape": "round",
        "type": "smooth",
        "table": [
            {"bendRatio": 0.5, "lossCoefficient": 0.71},
            {"bendRatio": 0.75, "lossCoefficient": 0.33},
            {"bendRatio": 1.0, "lossCoefficient": 0.22},
            {"bendRatio": 1.5, "lossCoefficient": 0.15},
            {"bendRatio": 2.0, "lossCoefficient": 0.13},
            {"bendRatio": 2.5, "lossCoefficient": 0.12}
        ]
    },
    {
        "class": "elbow",
        "shape": "round",
        "type": "gored",
        "table": [
            {"numberOfPieces": 3, "bendRatio": 0.5, "lossCoefficient": 0.98},
            {"numberOfPieces": 3, "bendRatio": 0.75, "lossCoefficient": 0.54},
            {"numberOfPieces": 3, "bendRatio": 1.0, "lossCoefficient": 0.42},
            {"numberOfPieces": 3, "bendRatio": 1.5, "lossCoefficient": 0.34},
            {"numberOfPieces": 3, "bendRatio": 2.0, "lossCoefficient": 0.33},
            {"numberOfPieces": 4, "bendRatio": 0.75, "lossCoefficient": 0.5},
            {"numberOfPieces": 4, "bendRatio": 1.0, "lossCoefficient": 0.37},
            {"numberOfPieces": 4, "bendRatio": 1.5, "lossCoefficient": 0.27},
            {"numberOfPieces": 4, "bendRatio": 2.0, "lossCoefficient": 0.24},
            {"numberOfPieces": 5, "bendRatio": 0.75, "lossCoefficient": 0.46},
            {"numberOfPieces": 5, "bendRatio": 1.0, "lossCoefficient": 0.33},
            {"numberOfPieces": 5, "bendRatio": 1.5, "lossCoefficient": 0.24},
            {"numberOfPieces": 5, "bendRatio": 2.0, "lossCoefficient": 0.19}
        ]
    },
    {
        "class": "elbow",
        "shape": "round",
        "type": "mitered",
        "table": [
            {"bendAngle": 20, "lossCoefficient": 0.08},
            {"bendAngle": 30, "lossCoefficient": 0.16},
            {"bendAngle": 45, "lossCoefficient": 0.34},
            {"bendAngle": 60, "lossCoefficient": 0.55},
            {"bendAngle": 75, "lossCoefficient": 0.81},
            {"bendAngle": 90, "lossCoefficient": 1.2}
        ]
    }
];

function augmentDuctType(ductType) {
    var name = "";
    if (ductType.class) {
        name += ductType.class + " ";
    }
    if (ductType.shape) {
        name += ductType.shape + " ";
    }
    if (ductType.type) {
        name += ductType.type + " ";
    }
    if (ductType.specifier) {
        name += ductType.specifier + " ";
    }
    ductType.name = s.titleize(name);
    ductType.keyword = s.camelize(name);
    ductType.template = ductType.keyword + "Form";

    return ductType;
}

Meteor.startup(function () {
    if (DuctTypes.find().count() === 0) {
        var augmentedDuctTypes = _.map(ductTypes, function(ductType) {
            return augmentDuctType(ductType);
        });

        _.each(augmentedDuctTypes, function(ductType) {
            DuctTypes.insert(ductType);
        });
    }
    temporaryFiles.allow({
        insert: function (userId, file) {
            return true;
        },
        remove: function (userId, file) {
            return true;
        },
        read: function (userId, file) {
            return true;
        },
        write: function (userId, file, fields) {
            return true;
        }
    });
});

Meteor.publish("ducts", function() {
    return Ducts.find();
});

Meteor.publish("ductTypes", function() {
    return DuctTypes.find();
});

Meteor.publish("projects", function() {
    return Projects.find();
});

Meteor.publish("paths", function() {
    return Paths.find({owner: this.userId});
});

Meteor.methods({
  downloadExcelFile : function(path) {
    check(path, Match.ObjectIncluding({
        _id: String
    }));
    var Future = Npm.require('fibers/future');
    var futureResponse = new Future();

    var excel = new Excel('xlsx'); // Create an excel object  for the file you want (xlsx or xls)
    var workbook = excel.createWorkbook(); // Create a workbook (equivalent of an excel file)
    var calcsheet = excel.createWorksheet(); // Create a calcsheet to be added to the workbook
    calcsheet.writeToCell(0,0, 'Pressure Loss Calculation for: ' + path.name); // Example : writing to a cell
    calcsheet.mergeCells(0,0,0,1); // Example : merging files
    calcsheet.writeToCell(1,0, 'Ordering');
    calcsheet.writeToCell(1,1, 'Name');
    calcsheet.writeToCell(1,2, 'CFM');
    calcsheet.writeToCell(1,3, 'Velocity (fpm)');
    calcsheet.writeToCell(1,4, 'Velocity Pressure (in. wg)');
    calcsheet.writeToCell(1,5, 'Length (ft)');
    calcsheet.writeToCell(1,6, 'Coeff. of Pressure Loss');
    calcsheet.writeToCell(1,7, 'Pressure Loss (in. wg)');

    calcsheet.setColumnProperties([ // Example : setting the width of columns in the file
      { wch: 5 },
      { wch: 20 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 20 }
    ]);

    // Example : writing multple rows to file
    var row = 3;
    var totalPressureLoss = 0;
    Ducts.find({pathID: path._id}).forEach(function(duct, i) {
      calcsheet.writeToCell(row, 0, i);
      calcsheet.writeToCell(row, 1, duct.name);
      calcsheet.writeToCell(row, 2, duct.inlet.flowrate);
      calcsheet.writeToCell(row, 3, duct.inlet.velocity);
      calcsheet.writeToCell(row, 4, duct.inlet.velocityPressure);
      calcsheet.writeToCell(row, 5, duct.length || 'N/A');
      calcsheet.writeToCell(row, 6, duct.lossCoefficient || 'N/A');
      calcsheet.writeToCell(row, 7, duct.pressureLoss);
      totalPressureLoss += duct.pressureLoss;
      row++;
    });
    calcsheet.writeToCell(row + 1, 6, "Total Pressure Loss");
    calcsheet.writeToCell(row + 1, 7, totalPressureLoss);
    console.log(calcsheet);

    workbook.addSheet(path.name + '- Calculations', calcsheet); // Add the calcsheet to the workbook

    var documentation = excel.createWorksheet();

    documentation.writeToCell(0, 0, 'Explanation of Calculations');

    workbook.addSheet('Documentation', documentation);


    mkdirp('tmp', Meteor.bindEnvironment(function (err) {
      if (err) {
        console.log('Error creating tmp dir', err);
        futureResponse.throw(err);
      }
      else {
        var uuid = UUID.v4();
        var filePath = './tmp/' + uuid;
        workbook.writeToFile(filePath);

        temporaryFiles.importFile(filePath, {
          filename : uuid,
          contentType: 'application/octet-stream'
        }, function(err, file) {
          if (err) {
            futureResponse.throw(err);
          }
          else {
            futureResponse.return('/gridfs/temporaryFiles/' + file._id);
          }
        });
      }
    }));

    return futureResponse.wait();
  }
});

Accounts.validateNewUser(function(user) {
    return true;
});
