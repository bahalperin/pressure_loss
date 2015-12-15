Meteor.subscribe("ducts");
Meteor.subscribe("ductTypes");
Meteor.subscribe("projects");
Meteor.subscribe("paths");

AutoForm.debug();

Session.set("showPathForm", false);
Session.set("formMode", "insert");

AutoForm.addHooks('insertPathForm', {
    before: {
        insert: function(doc) {
            if (Session.get("chosenProject")) {
                doc.projectID = Session.get("chosenProject")._id;
            }
            return doc;
        }
    }
});

AutoForm.addHooks('duct-form', {
    before: {
        insert: function(doc) {
            if (Session.get("chosenDuctType")
                && Session.get("chosenPath")) {
                doc.ductTypeID = Session.get("chosenDuctType")._id;
                doc.pathID = Session.get("chosenPath")._id;
            }
            return doc;
        },
        update: function(modifier) {
            var self = this;
            if (Session.get("chosenDuctType")
                && Session.get("chosenPath")) {
                modifier.$set.ductTypeID = Session.get("chosenDuctType")._id;
                modifier.$set.pathID = Session.get("chosenPath")._id;
                // If we're changing the type of duct/fitting when updating, we need to remove
                // all attributes that no longer apply.
                Meteor.call("getAttributesForDuctType", Session.get("chosenDuct").ductTypeID, function(error, currentAttributes) {
                    if (!error) {
                        Meteor.call("getAttributesForDuctType", Session.get("chosenDuctType")._id, function(error, newAttributes) {
                            if (!error) {
                                var removeAttributes = _.difference(currentAttributes, newAttributes);
                                if (removeAttributes.length) {
                                    modifier.$unset = {};
                                    _.each(removeAttributes, function(attribute) {
                                        modifier.$unset[attribute] = '';
                                    })
                                }

                                self.result(modifier);
                            }
                        });
                    }
                    else {
                        console.log(error);
                    }
                });
            }
            else {
                console.log(error);
            }
        },
    },
    after: {
        update: function(modifier) {
            Session.set("showDuctForm", false);
            Session.set("formMode", "insert");
            Session.set("chosenDuct", null);
        }
    }
});

Template.body.helpers({
    chosenPathDuctwork: function() {
        var path = Session.get("chosenPath");
        if (path) {
            return Ducts.find({pathID: path._id}, {sort: [["createdAt", "asc"]]}).map(function(doc, i) {
                doc.formattedProperties = HVAC.formatProperties(doc);
                doc.ordering = i;
                return doc;
            });
        }
    },
    projects: function() {
        if (Meteor.userId()) {
            return Projects.find({owner: Meteor.userId()});
        }
    },
    chosenProject: function() {
        if (! Session.get("chosenProject")) {
            Session.set("chosenProject", Projects.findOne());
        }
        return Session.get('chosenProject');
    },
    isChosenProject: function(project) {
        if (! Session.get('chosenProject')) {
            return false;
        }
        return (project._id === Session.get('chosenProject')._id);
    },
    paths: function() {
        if (Meteor.userId()) {
            return Paths.find({owner: Meteor.userId()});
        }
    },
    isChosenPath: function(path) {
        if (! Session.get('chosenPath')) {
            return false;
        }
        return (path._id === Session.get('chosenPath')._id);
    },
    chosenPath: function() {
        if (! Session.get("chosenPath")) {
            return {
                name: 'No path chosen',
            };
        }
        return Session.get('chosenPath');
    },
    ductTypes: function() {
        return DuctTypes.find();
    },
    chosenPathPressureLoss: function() {
        var total = 0;
        if (Session.get("chosenPath")) {
            var pressureLosses = Ducts.find({pathID: Session.get("chosenPath")._id}).forEach(function(duct) {
                total += duct.pressureLoss;
            });
        }
        return s.numberFormat(total,2);
    },
    showDuctForm: function() {
        return Session.get("showDuctForm");
    },
    showPathForm: function() {
        return Session.get("showPathForm");
    },
    showProjectForm: function() {
        return Session.get("showProjectForm");
    },
    formData: function() {
        var chosenDuctID = Session.get("chosenDuct") ? Session.get("chosenDuct")._id : null;
        return {
            formMode: Session.get("formMode"),
            doc: Ducts.findOne({_id: chosenDuctID})
        };
    },
    chosenDuct: function() {
        return Session.get('chosenDuct');
    }
});

Template.body.events({
    "click .add-path": function() {
        Session.set("showPathForm", true);
    },
    "click .cancel-add-path": function() {
        Session.set("showPathForm", false);
    },
    "click .add-project": function() {
        Session.set("showProjectForm", true);
    },
    "click .cancel-add-project": function() {
        Session.set("showProjectForm", false);
    },
    "click .project-option": function() {
        Session.set("chosenProject", this);
        Session.set("chosenPath", null);
        Session.set("chosenDuct", null);
        Session.set("formMode", "insert");
    },
    "click .path-option": function() {
        Session.set("chosenPath", this);
        Session.set("chosenDuct", null);
        Session.set("formMode", "insert");
    },
    /*
    "click .path-item": function() {
        Session.set("chosenDuctType", DuctTypes.findOne({_id: this.ductTypeID}));
        //Session.set("formMode", "update");
        Session.set("chosenDuct", this);
        AutoForm.resetForm("#duct-form");
    },
    */
    'click .create-excel': function () {
        var chosenPath = Session.get("chosenPath");
        if (chosenPath) {
            Meteor.call('downloadExcelFile', chosenPath, function(err, fileUrl) {
                console.log(fileUrl);
                var link = document.createElement("a");
                link.download = chosenPath.name + '.xlsx';
                link.href = fileUrl;
                link.click();
            });
        }
    },
    'click .add-duct': function () {
        Session.set("formMode", "insert");
        Session.set("chosenDuct", null);
        Session.set("showDuctForm", true);
    },
    'click .logout': function (event) {
        event.preventDefault();
        Meteor.logout();
    }
});

Template.genericDuct.helpers({
    selected: function() {
        if (Session.get("chosenDuct")) {
            return this._id === Session.get("chosenDuct")._id;
        }
    }
});

Template.genericDuct.events({
    "click .path-item": function() {
        Session.set("chosenDuctType", DuctTypes.findOne({_id: this.ductTypeID}));
        Session.set("chosenDuct", this);
    },
    "click .delete": function() {
        if (this._id === Session.get("chosenDuct")) {
            Session.set("formMode", "insert");
        }
        Session.set("chosenDuct", null);

        Meteor.call("deleteDuct", this);
    },
   "click .edit": function() {
        Session.set("chosenDuctType", DuctTypes.findOne({_id: this.ductTypeID}));
        Session.set("formMode", "update");
        Session.set("chosenDuct", this);
        AutoForm.resetForm("#duct-form");
   }
});

Template.ductRow.helpers({
    selected: function() {
        if (Session.get("chosenDuct")) {
            return this._id === Session.get("chosenDuct")._id;
        }
    },
    isExpanded: function() {
        return Session.equals("expandedRow", this._id);
    },
    collapsedProperties: function() {
        if (Session.get("chosenDuct")) {
            var duct = Session.get("chosenDuct");
			var formattedProperties = HVAC.formatProperties(duct);
			var rowProperties = {
				ordering: 1,
				name: 1,
				pressureLoss: 1,
				area: 1,
				velocity: 1,
				flowrate: 1
			};

			var collapsedProperties = _.chain(formattedProperties)
				.pairs()
				.map(function(pair) {
					return {
						key: pair[0],
						value: pair[1]
					};
				})
				.filter(function(pair) {
					return !rowProperties[pair.key];
				})
				.value();

			return collapsedProperties;
        }
    }
});

Template.ductRow.events({
    "click .duct-row": function() {
        Session.set("chosenDuctType", DuctTypes.findOne({_id: this.ductTypeID}));
        Session.set("chosenDuct", this);
        if (Session.equals("expandedRow", this._id)) {
            Session.set("expandedRow", null);
        }
        else {
            Session.set("expandedRow", this._id);
        }
    },
    "click .delete": function() {
        if (this._id === Session.get("chosenDuct")) {
            Session.set("formMode", "insert");
        }
        Session.set("chosenDuct", null);

        Meteor.call("deleteDuct", this);

        return false;
    },
   "click .edit": function() {
        Session.set("chosenDuctType", DuctTypes.findOne({_id: this.ductTypeID}));
        Session.set("formMode", "update");
        Session.set("chosenDuct", this);
        AutoForm.resetForm("#duct-form");
        Session.set("showDuctForm", true);

        return false;
   }
});

Template.projectOption.helpers({
    isChosenProject: function() {
        if (Session.get("chosenProject")) {
            return (this._id === Session.get("chosenProject")._id);
        }
    },
    projectPaths: function() {
        if (Meteor.userId() && Session.get('chosenProject')) {
            return Paths.find({owner: Meteor.userId(), projectID: Session.get('chosenProject')._id});
        }
    }
});

Template.pathOption.helpers({
    isChosenPath: function() {
        if (Session.get("chosenPath")) {
            return (this._id === Session.get("chosenPath")._id);
        }
    }
});

Template.login.events({
    'submit form': function(event, template) {
        event.preventDefault();
        var username = template.find("#login-username").value;
        var password = template.find("#login-password").value;
        Meteor.loginWithPassword(username, password, function(error) {
            if (error) {
                Session.set('UserLoginError', error.reason);
            }
            else {
                Session.set('UserLoginError', '');
            }
        });
    }
});

Template.register.events({
    'submit form': function(event, template) {
        event.preventDefault();
        var username = template.find("#register-username").value;
        var password = template.find("#register-password").value;

        var firstName = template.find("#register-first-name").value;
        var lastName = template.find("#register-last-name").value;

        var processedUsername = s.trim(username);
        var processedFirstName = s.trim(firstName);
        var processedLastName = s.trim(lastName);
        if (isValidUsername(processedUsername) && isValidPassword(password)) {
            Accounts.createUser({
                username: processedUsername,
                password: password,
                profile: {
                    firstName: processedFirstName,
                    lastName: processedLastName
                }
            }, function(error) {
                if (error) {
                    Session.set('UserRegisterError', error.reason);
                }
                else {
                    Session.set('UserRegisterError', '');
                }
            });
        }
    }
});

Template.login.helpers({
    errorMessage: function() {
        return Session.get('UserLoginError');
    }
});

Template.register.helpers({
    errorMessage: function() {
        return Session.get('UserRegisterError');
    }
});

function isValidUsername(username) {
    if (!_.isString(username)) {
        Session.set('UserRegisterError', 'Username must be a string');
        return false;
    }

    if (s.include(username, ' ')) {
        Session.set('UserRegisterError', 'Username cannot contain spaces');
        return false;
    }

    Session.set('UserRegisterError', '');
    return true;
}

function isValidPassword(password) {
    if (!_.isString(password)) {
        Session.set('UserRegisterError', 'Your password must be a string');
        return false;
    }

    if (password.length < 6) {
        Session.set('UserRegisterError', 'Your password must be at least 6 characters');
        return false;
    }

    if (s.include(password, ' ')) {
        Session.set('UserRegisterError', 'Your password cannot include spaces');
        return false;
    }

    Session.set('UserRegisterError', '');
    return true;
}

Template.ductSearch.events({
    'keyup input.search-query': function (event) {
        Session.set("searchQuery", event.currentTarget.value);
    },
})

Template.ductSearchResults.helpers({
    filteredDucts: function() {
        var keyword  = Session.get("searchQuery");
        var query = new RegExp( keyword, 'i' );
        var filteredDucts = DuctTypes.find( { $or: [{'class': query},
                                            {'shape': query},
                                            {'type': query},
                                            {'name': query}] } );
        return filteredDucts;
    }
});

Template.ductSearchResults.events({
    "click .duct-option": function() {
        Session.set("chosenDuctType", this);
        AutoForm.resetForm("#duct-form");
    }
});

Template.updateDuctSearch.events({
    'keyup input.update-search-query': function (event) {
        Session.set("updateSearchQuery", event.currentTarget.value);
    },
})

Template.updateDuctSearchResults.helpers({
    filteredDucts: function() {
        var keyword  = Session.get("updateSearchQuery");
        var query = new RegExp( keyword, 'i' );
        var filteredDucts = DuctTypes.find( { $or: [{'class': query},
                                            {'shape': query},
                                            {'type': query},
                                            {'name': query}] } );
        return filteredDucts;
    }
});

Template.updateDuctSearchResults.events({
    "click .duct-option": function() {
        Session.set("chosenDuctType", this);
        AutoForm.resetForm("#duct-form");
    }
});

Template.navBar.events({
    "click .project-option": function() {
        Session.set("chosenProject", this);
        Session.set("chosenPath", null);
        Session.set("chosenDuct", null);
        Session.set("formMode", "insert");
    },
    "click .path-option": function() {
        Session.set("chosenPath", this);
        Session.set("chosenDuct", null);
        Session.set("formMode", "insert");
    }
});

Template.navBar.helpers({
    projects: function() {
        if (Meteor.userId()) {
            var projects = Projects.find({owner: Meteor.userId()});
            if (projects.count() === 0) {
                return [{
                    name: 'You have not created any projects'
                }];
            }
            return Projects.find({owner: Meteor.userId()});
        }
    },
    projectPaths: function() {
        if (Meteor.userId() && Session.get('chosenProject')) {
            return Paths.find({owner: Meteor.userId(), projectID: Session.get('chosenProject')._id});
        }
        else {
            return [{
                name: 'Please select a project'
            }];
        }
    },
    chosenProject: function() {
        if (! Session.get("chosenProject")) {
            return {
                name: 'No project chosen',
            };
        }
        return Session.get('chosenProject');
    },
    chosenPath: function() {
        if (! Session.get("chosenPath")) {
            return {
                name: 'No path chosen',
            };
        }
        return Session.get('chosenPath');
    },
    chosenPathPressureLoss: function() {
        var total = 0;
        if (Session.get("chosenPath")) {
            var pressureLosses = Ducts.find({pathID: Session.get("chosenPath")._id}).forEach(function(duct) {
                total += duct.pressureLoss;
            });
        }
        return s.numberFormat(total,2);
    },
    isProjectChosen: function() {
        return Session.get('chosenProject');
    },
    isPathChosen: function() {
        return Session.get('chosenPath');
    }
});

Template.pageDetails.helpers({
    chosenProject: function() {
        if (! Session.get("chosenProject")) {
            return {
                name: 'No project chosen',
            };
        }
        return Session.get('chosenProject');
    },
    chosenPath: function() {
        console.log(Session.get("chosenPath"));
        if (! Session.get("chosenPath")) {
            return {
                name: 'No path chosen',
            };
        }
        return Session.get('chosenPath');
    },
    chosenPathPressureLoss: function() {
        var total = 0;
        if (Session.get("chosenPath")) {
            var pressureLosses = Ducts.find({pathID: Session.get("chosenPath")._id}).forEach(function(duct) {
                total += duct.pressureLoss;
            });
        }
        return s.numberFormat(total,2);
    },
});

Template.ductForm.helpers({
    formData: function() {
        var chosenDuctID = Session.get("chosenDuct") ? Session.get("chosenDuct")._id : null;
        return {
            formMode: Session.get("formMode"),
            doc: Ducts.findOne({_id: chosenDuctID})
        };
    },
    isInsert: function() {
        return Session.get("formMode") === "insert";
    },
    isUpdate: function() {
        return Session.get("formMode") === "update";
    },
    chosenDuct: function() {
        return Session.get('chosenDuct');
    },
    chosenDuctType: function() {
        if (! Session.get("chosenDuctType")) {
            Session.set("chosenDuctType", DuctTypes.findOne());
        }
        return Session.get('chosenDuctType');
    },
});

Template.ductForm.events({
    "click .duct-form-close": function() {
        Session.set('showDuctForm', false);
        Session.set('searchQuery', '');
    }
});
