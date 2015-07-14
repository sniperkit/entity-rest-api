/*global angular*/
(function () {
    "use strict";

    var app = angular.module('AdminApp', ['ng-admin']);

    app.controller('main', function ($scope, $rootScope, $location) {
        $rootScope.$on('$stateChangeSuccess', function () {
            $location.$$path === '/dashboard';
        });
    });

    // use custom query parameters function to format the API request correctly
    app.config(function(RestangularProvider) {
        RestangularProvider.addFullRequestInterceptor(function(element, operation, what, url, headers, params) {
            if (operation == "getList") {
                // custom pagination params
                params._page = (params._page - 1) * params._perPage;

                // custom filters
                if (params._filters) {
                    for (var filter in params._filters) {
                        params[filter] = params._filters[filter];
                    }
                    delete params._filters;
                }
            }

            return { params: params };
        });
    });

    app.config(function (NgAdminConfigurationProvider, RestangularProvider) {
        var nga = NgAdminConfigurationProvider;

        function truncate(value) {
            if (!value) {
                return '';
            }

            return value.length > 50 ? value.substr(0, 50) + '...' : value;
        }

        var admin = nga.application('Entity REST API demo using ng-admin') // application main title
            .baseApiUrl('http://localhost:8080/api/'); // main API endpoint

        // define all entities at the top to allow references between them
        var post = nga.entity('Post');
        var comment = nga.entity('Comment');
        var tag = nga.entity('Tag')
            .readOnly(); // a readOnly entity has disabled creation, edition, and deletion views

        // set the application entities
        admin
            .addEntity(post)
            .addEntity(tag)
            .addEntity(comment);

        // customize entities and views
        post.dashboardView() // customize the dashboard panel for this entity
            .title('Recent posts')
            .order(1) // display the post panel first in the dashboard
            .perPage(5) // limit the panel to the 5 latest posts
            .fields([nga.field('title').isDetailLink(true).map(truncate)]); // fields() called with arguments add fields to the view

        post.listView()
            .title('All posts') // default title is "[Entity_name] list"
            .description('List of posts with infinite pagination') // description appears under the title
            .infinitePagination(true) // load pages as the user scrolls
            .fields([
                nga.field('id').label('ID'), // The default displayed name is the camelCase field name. label() overrides id
                nga.field('title'), // the default list field type is "string", and displays as a string
                nga.field('create_time', 'date'), // Date field type allows date formatting
            ])
            .sortDir('ASC')
            .listActions(['show', 'edit', 'delete']);

        post.creationView()
            .fields([
                nga.field('title') // the default edit field type is "string", and displays as a text input
                    .attributes({ placeholder: 'the post title' }) // you can add custom attributes, too
                    .validation({ required: true, minlength: 3, maxlength: 100 }), // add validation rules for fields
                nga.field('content', 'wysiwyg'), // overriding the type allows rich text editing for the body
                nga.field('create_time', 'date') // Date field type translates to a datepicker
            ]);

        post.editionView()
            .title('Edit post "{{ entry.values.title }}"') // title() accepts a template string, which has access to the entry
            .actions(['list', 'show', 'delete']) // choose which buttons appear in the top action bar. Show is disabled by default
            .fields([
                post.creationView().fields(), // fields() without arguments returns the list of fields. That way you can reuse fields from another view to avoid repetition
                nga.field('comments', 'referenced_list') // display list of related comments
                    .targetEntity(comment)
                    .targetReferenceField('post_id')
                    .targetFields([
                        nga.field('id'),
                        nga.field('content').label('Comment')
                    ]),
                nga.field('', 'template').label('')
                    .template('<span class="pull-right"><ma-filtered-list-button entity-name="Comment" filter="{ post_id: entry.values.id }" size="sm"></ma-filtered-list-button></span>')
            ]);

        post.showView() // a showView displays one entry in full page - allows to display more data than in a a list
            .fields([
                nga.field('id'),
                post.editionView().fields(), // reuse fields from another view in another order
            ]);

        comment.dashboardView()
            .title('Last comments')
            .order(2) // display the comment panel second in the dashboard
            .perPage(5)
            .fields([
                nga.field('id'),
                nga.field('author'),
                nga.field('content'),
            ]);

        comment.listView()
            .title('Comments')
            .perPage(10) // limit the number of elements displayed per page. Default is 30.
            .fields([
                nga.field('create_time', 'date')
                    .label('Posted')
                    .order(1),
                nga.field('post_id', 'reference')
                    .label('Post')
                    .map(truncate)
                    .targetEntity(post)
                    .targetField(nga.field('title').map(truncate))
                    .order(4),
                nga.field('author').order(2)
            ])
            .sortDir('ASC')
            .filters([
                nga.field('q', 'template')
                    .label('')
                    .template('<div class="input-group"><input type="text" ng-model="value" placeholder="Search" class="form-control"></input><span class="input-group-addon"><i class="glyphicon glyphicon-search"></i></span></div>'),
                nga.field('create_time', 'date')
                    .label('Posted')
                    .attributes({'placeholder': 'Filter by date'}),
                nga.field('post_id', 'reference')
                    .label('Post')
                    .targetEntity(post)
                    .targetField(nga.field('title'))
            ])
            .listActions(['edit', 'delete']);

        comment.creationView()
            .fields([
                nga.field('create_time', 'date')
                    .label('Posted')
                    .defaultValue(new Date()), // preset fields in creation view with defaultValue
                nga.field('author'),
                nga.field('post_id', 'reference')
                    .label('Post')
                    .map(truncate)
                    .targetEntity(post)
                    .targetField(nga.field('title')),
            ]);

        comment.editionView()
            .fields(comment.creationView().fields());

        comment.deletionView()
            .title('Deletion confirmation'); // customize the deletion confirmation message

        tag.dashboardView()
            .title('Recent tags')
            .order(3)
            .perPage(10)
            .fields([
                nga.field('id'),
                nga.field('name'),
            ]);

        tag.listView()
            .infinitePagination(false) // by default, the list view uses infinite pagination. Set to false to use regulat pagination
            .fields([
                nga.field('id').label('ID'),
                nga.field('name'),
                nga.field('custom', 'template')
                    .label('Upper name')
                    .template('{{ entry.values.name.toUpperCase() }}')
            ])
            .batchActions([]) // disable checkbox column and batch delete
            .listActions(['show']);

        tag.showView()
            .fields([
                nga.field('id'),
                nga.field('name')
            ]);

        admin.menu(nga.menu()
            .addChild(nga.menu(post).icon('<span class="glyphicon glyphicon-file"></span>')) // customize the entity menu icon
            .addChild(nga.menu(comment).icon('<strong style="font-size:1.3em;line-height:1em">✉</strong>')) // you can even use utf-8 symbols!
            .addChild(nga.menu(tag).icon('<span class="glyphicon glyphicon-tags"></span>'))
        );

        nga.configure(admin);
    });

}());
