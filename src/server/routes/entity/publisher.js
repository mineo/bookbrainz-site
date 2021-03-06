/*
 * Copyright (C) 2015  Ben Ockmore
 *               2015  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

'use strict';

var express = require('express');
var router = express.Router();
var auth = require('../../helpers/auth');
var Publisher = require('../../data/entities/publisher');
var User = require('../../data/user');

/* Middleware loader functions. */
var makeEntityLoader = require('../../helpers/middleware').makeEntityLoader;

var React = require('react');
var EditForm = React.createFactory(require('../../../client/components/forms/publisher.jsx'));
// Creation

var loadLanguages = require('../../helpers/middleware').loadLanguages;
var loadPublisherTypes = require('../../helpers/middleware').loadPublisherTypes;
var loadEntityRelationships = require('../../helpers/middleware').loadEntityRelationships;
var loadIdentifierTypes = require('../../helpers/middleware').loadIdentifierTypes;

var bbws = require('../../helpers/bbws');
var Promise = require('bluebird');

/* If the route specifies a BBID, load the Publisher for it. */
router.param('bbid', makeEntityLoader(Publisher, 'Publisher not found'));

router.get('/:bbid', loadEntityRelationships, function(req, res) {
	var publisher = res.locals.entity;
	var title = 'Publisher';

	if (publisher.default_alias && publisher.default_alias.name) {
		title = 'Publisher “' + publisher.default_alias.name + '”';
	}

	res.render('entity/view/publisher', {
		title: title
	});
});

router.get('/:bbid/revisions', function(req, res) {
	var publisher = res.locals.entity;
	var title = 'Publisher';

	if (publisher.default_alias && publisher.default_alias.name) {
		title = 'Publisher “' + publisher.default_alias.name + '”';
	}

	bbws.get('/Publisher/' + publisher.bbid + '/revisions')
		.then(function(revisions) {
			var promisedUsers = {};
			revisions.objects.forEach(function(revision) {
				if (!promisedUsers[revision.user.user_id]) {
					promisedUsers[revision.user.user_id] = User.findOne(revision.user.user_id);
				}
			});

			Promise.props(promisedUsers).then(function(users) {
				res.render('entity/revisions', {
					title: title,
					revisions: revisions,
					users: users
				});
			});
		});
});

// Creation

router.get('/create', auth.isAuthenticated, loadIdentifierTypes, loadLanguages, loadPublisherTypes, function(req, res) {
	var props = {
		languages: res.locals.languages,
		publisherTypes: res.locals.publisherTypes,
		identifierTypes: res.locals.identifierTypes,
		submissionUrl: '/publisher/create/handler'
	};

	var markup = React.renderToString(EditForm(props));

	res.render('entity/create/publisher', {
		title: 'Add Publisher',
		heading: 'Create Publisher',
		subheading: 'Add a new Publisher to BookBrainz',
		props: props,
		markup: markup
	});
});

router.get('/:bbid/edit', auth.isAuthenticated, loadIdentifierTypes, loadPublisherTypes, loadLanguages, function(req, res) {
	var publisher = res.locals.entity;

	var props = {
		languages: res.locals.languages,
		publisherTypes: res.locals.publisherTypes,
		publisher: publisher,
		identifierTypes: res.locals.identifierTypes,
		submissionUrl: '/publisher/' + publisher.bbid + '/edit/handler'
	};

	var markup = React.renderToString(EditForm(props));

	res.render('entity/create/publisher', {
		title: 'Edit Publisher',
		heading: 'Edit Publisher',
		subheading: 'Edit an existing Publisher in BookBrainz',
		props: props,
		markup: markup
	});
});

router.post('/create/handler', auth.isAuthenticated, function(req, res) {
	var changes = {
		bbid: null
	};

	if (req.body.publisherTypeId) {
		changes.publisher_type = {
			publisher_type_id: req.body.publisherTypeId
		};
	}

	if (req.body.beginDate) {
		changes.begin_date = req.body.beginDate;
	}

	if (req.body.endDate) {
		changes.end_date = req.body.endDate;
		changes.ended = true; // Must have ended if there's an end date.
	}
	else if (req.body.ended) {
		changes.ended = req.body.ended;
	}

	if (req.body.disambiguation) {
		changes.disambiguation = req.body.disambiguation;
	}

	if (req.body.annotation) {
		changes.annotation = req.body.annotation;
	}

	if (req.body.note) {
		changes.revision = {
			note: req.body.note
		};
	}

	var newIdentifiers = req.body.identifiers.map(function(identifier) {
		return {
			value: identifier.value,
			identifier_type: {
				identifier_type_id: identifier.typeId
			}
		};
	});

	if (newIdentifiers.length) {
		changes.identifiers = newIdentifiers;
	}

	var newAliases = [];

	req.body.aliases.forEach(function(alias) {
		if (!alias.name && !alias.sortName) {
			return;
		}

		newAliases.push({
			name: alias.name,
			sort_name: alias.sortName,
			language_id: alias.language,
			primary: alias.primary,
			default: alias.default
		});
	});

	if (newAliases.length) {
		changes.aliases = newAliases;
	}

	Publisher.create(changes, {
			session: req.session
		})
		.then(function(revision) {
			res.send(revision);
		});
});

router.post('/:bbid/edit/handler', auth.isAuthenticated, function(req, res) {
	var publisher = res.locals.entity;

	var changes = {
		bbid: publisher.bbid
	};

	var publisherTypeId = req.body.publisherTypeId;
	if ((!publisher.publisher_type) ||
		(publisher.publisher_type.publisher_type_id !== publisherTypeId)) {
		changes.publisher_type = {
			publisher_type_id: publisherTypeId
		};
	}

	var beginDate = req.body.beginDate;
	if (publisher.begin_date !== beginDate) {
		changes.begin_date = beginDate ? beginDate : null;
	}

	var endDate = req.body.endDate;
	var ended = req.body.ended;
	if (publisher.end_date !== endDate) {
		changes.end_date = endDate ? endDate : null;
		changes.ended = endDate ? true : ended; // Must have ended if there's an end date.
	}

	var disambiguation = req.body.disambiguation;
	if ((!publisher.disambiguation) ||
		(publisher.disambiguation.comment !== disambiguation)) {
		changes.disambiguation = disambiguation ? disambiguation : null;
	}

	var annotation = req.body.annotation;
	if ((!publisher.annotation) ||
		(publisher.annotation.content !== annotation)) {
		changes.annotation = annotation ? annotation : null;
	}

	if (req.body.note) {
		changes.revision = {
			note: req.body.note
		};
	}

	var currentIdentifiers = publisher.identifiers.map(function(identifier) {
		var nextIdentifier = req.body.identifiers[0];

		if (identifier.id !== nextIdentifier.id) {
			// Remove the alias
			return [identifier.id, null];
		}
		else {
			// Modify the alias
			req.body.identifiers.shift();
			return [nextIdentifier.id, {
				value: nextIdentifier.value,
				identifier_type: {
					identifier_type_id: nextIdentifier.typeId
				}
			}];
		}
	});

	var newIdentifiers = req.body.identifiers.map(function(identifier) {
		// At this point, the only aliases should have null IDs, but check anyway.
		if (identifier.id) {
			return null;
		}
		else {
			return [null, {
				value: identifier.value,
				identifier_type: {
					identifier_type_id: identifier.typeId
				}
			}];
		}
	});

	changes.identifiers = currentIdentifiers.concat(newIdentifiers);

	var currentAliases = [];

	publisher.aliases.forEach(function(alias) {
		var nextAlias = req.body.aliases[0];

		if (alias.id !== nextAlias.id) {
			// Remove the alias
			currentAliases.push([alias.id, null]);
		}
		else {
			// Modify the alias
			req.body.aliases.shift();
			currentAliases.push([nextAlias.id, {
				name: nextAlias.name,
				sort_name: nextAlias.sortName,
				language_id: nextAlias.language,
				primary: nextAlias.primary,
				default: nextAlias.default
			}]);
		}
	});

	var newAliases = [];

	req.body.aliases.forEach(function(alias) {
		// At this point, the only aliases should have null IDs, but check anyway.
		if (alias.id || (!alias.name && !alias.sortName)) {
			return;
		}

		newAliases.push([null, {
			name: alias.name,
			sort_name: alias.sortName,
			language_id: alias.language,
			primary: alias.primary,
			default: alias.default
		}]);
	});

	changes.aliases = currentAliases.concat(newAliases);

	Publisher.update(publisher.bbid, changes, {
			session: req.session
		})
		.then(function(revision) {
			res.send(revision);
		});
});

module.exports = router;
