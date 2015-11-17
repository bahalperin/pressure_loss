Schemas = {};

Schemas.ChangeTracking = new SimpleSchema({
    owner: {
        type: String,
        autoValue: function() {
            if (this.isInsert) {
                if (Meteor.user()) {
                    return Meteor.userId();
                }
                this.unset();
            }
        },
        denyUpdate: true,
        autoform: {
            omit: true
        }
    },
    createdAt: {
        type: Date,
        autoValue: function() {
            if (this.isInsert) {
                return new Date;
            } else if (this.isUpsert) {
                return {$setOnInsert: new Date};
            } else {
                this.unset();
            }
        },
        autoform: {
            omit: true
        }
    },
    createdBy: {
        type: String,
        autoValue: function() {
            if (this.isInsert) {
                if (Meteor.user()) {
                    return Meteor.user().username;
                }
                else {
                    throw new Error("Please log in or set up an account!");
                }
            }
            else {
                this.unset();
            }
        },
        denyUpdate: true,
        autoform: {
            omit: true
        }
    },
    updatedAt: {
        type: Date,
        autoValue: function() {
            if (this.isUpdate) {
                return new Date();
            }
        },
        denyInsert: true,
        optional: true,
        autoform: {
            omit: true
        }
    },
    updatedBy: {
        type: String,
        autoValue: function() {
            if (this.isUpdate) {
                return Meteor.user().username;
            }
        },
        denyInsert: true,
        optional: true,
        autoform: {
            omit: true
        }
    }
});

Schemas.BaseDuct = new SimpleSchema([
    Schemas.ChangeTracking,
    {
        ductTypeID: {
            type: String,
            optional: true,
            autoform: {
                omit: true
            }
        },
        pathID: {
            type: String,
            optional: true,
            autoform: {
                omit: true
            }
        }
    }
]);

Schemas.ConnectionRound = new SimpleSchema({
    diameter: {
        type: Number,
        min: 1,
        label: "Diameter"
    },
    flowrate: {
        type: Number,
        min: 0,
        decimal: true,
        label: "Flowrate"
    }
});

Schemas.ConnectionRectangular = new SimpleSchema({
    width: {
        type: Number,
        min: 1,
        label: "Width"
    },
    height: {
        type: Number,
        min: 1,
        label: "Height"
    },
    flowrate: {
        type: Number,
        min: 0,
        decimal: true,
        label: "Flowrate"
    }
});

Schemas.DuctRound = new SimpleSchema([
    {
        inlet: {
            type: Schemas.ConnectionRound,
            label: "Inlet"
        },
        length: {
            type: Number,
            min: 1,
            decimal: true,
            label: "Length"
        },
    },
    Schemas.BaseDuct
]);

Schemas.DuctRectangular = new SimpleSchema([
    {
        inlet: {
            type: Schemas.ConnectionRectangular,
            label: "Inlet"
        },
        length: {
            type: Number,
            min: 1,
            decimal: true,
            label: "Length"
        }
    },
    Schemas.BaseDuct
]);

Schemas.ElbowRoundSmooth = new SimpleSchema([
    {
        inlet: {
            type: Schemas.ConnectionRound,
            label: "Inlet"
        },
        bendRadius: {
            type: Number,
            min: 1,
            label: "Bend Radius"
        },
        bendAngle: {
            type: Number,
            allowedValues: [0, 20, 30, 45, 60, 75, 90, 110, 130, 150, 180],
            label: "Bend Angle",
            autoform: {
                defaultValue: 90
            }
        }
    },
    Schemas.BaseDuct
]);

Schemas.ElbowRoundGored = new SimpleSchema([
    {
        inlet: {
            type: Schemas.ConnectionRound,
            label: "Inlet"
        },
        numberOfPieces: {
            type: Number,
            allowedValues: [3,4,5],
            label: "Number of Pieces",
            autoform: {
                defaultValue: 3
            }
        },
        bendRadius: {
            type: Number,
            min: 1,
            label: "Bend Radius"
        }
    },
    Schemas.BaseDuct
]);

DuctTypes = new Mongo.Collection("ductTypes");

Ducts = new Mongo.Collection("ducts", {
    transform: function(doc) {
        var ductType = DuctTypes.findOne({_id: doc.ductTypeID});
        if (ductType) {
            doc = HVAC.transform({
                duct: doc,
                ductType: ductType
            });
        }
        return doc;
    }
});

Ducts.allow({
  insert: function(userId, doc) {
    // only allow posting if you are logged in
    return !! userId;
  },
  update: function(userId, doc) {
    // only allow updating if you are logged in
    return !! userId;
  },
  remove: function(userID, doc) {
    //only allow deleting if you are owner
    return doc.owner === Meteor.userId();
  }
});

Projects = new Mongo.Collection("projects");
Projects.allow({
  insert: function(userId, doc) {
    // only allow posting if you are logged in
    return !! userId;
  },
  update: function(userId, doc) {
    // only allow updating if you are logged in
    return !! userId;
 },
  remove: function(userID, doc) {
    //only allow deleting if you are owner
    return doc.owner === Meteor.userId();
  }
});
Projects.attachSchema(new SimpleSchema([
    Schemas.ChangeTracking,
    {
        name: {
            type: String
        },
        location: {
            type: Object
        },
        'location.address': {
            type: String,
            label: 'Address'
        },
        'location.city': {
            type: String
        },
        'location.state': {
            type: String
        },
        'location.zipcode': {
            type: String
        },
        description: {
            type: String
        }
    }
]));

Paths = new Mongo.Collection("paths", {
    transform: function(doc) {
        doc.Ducts = Ducts.find({pathID: doc._id}).fetch();
        return doc;
    }
});
Paths.allow({
  insert: function(userId, doc) {
    // only allow posting if you are logged in
    return !! userId;
  },
  update: function(userId, doc) {
    // only allow updating if you are logged in
    return !! userId;
 },
  remove: function(userID, doc) {
    //only allow deleting if you are owner
    return doc.owner === Meteor.userId();
  }
});

Paths.attachSchema(new SimpleSchema([
    Schemas.ChangeTracking,
    {
        name: {
            type: String
        },
        projectID: {
            type: String,
            optional: true,
            autoform: {
                omit: true
            }
        }
    }
]));

Meteor.methods({
    deleteDuct: function (duct) {
        Ducts.remove({_id: duct._id});
    },
    getAttributesForDuctType: function(ductTypeID) {
        var ductType = DuctTypes.findOne({_id: ductTypeID});

        var schema = Schemas[s.classify(ductType.name)];
        return schema.objectKeys();
    }
});


_.mixin({
    isInteger: Number.isInteger || function(value) {
        return (typeof value === "number")
            && isFinite(value)
            && (Math.floor(value) === value);
    }
});


temporaryFiles = new FileCollection('temporaryFiles',
  { resumable: false,   // Enable built-in resumable.js upload support
    http: [
      { method: 'get',
        path: '/:_id',  // this will be at route "/gridfs/temporaryFiles/:_id"
        lookup: function (params) {  // uses express style url params
          return { _id: params._id};       // a query mapping url to myFiles
        }
      },
      { method: 'post',
        path: '/:_id',
        lookup: function (params) {
          return {
            _id: params._id
          }
        }}
    ]
  }
);
