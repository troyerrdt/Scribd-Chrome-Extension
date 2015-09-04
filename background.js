var globalUrl = {};

var createNewTab = function(tab) {
    chrome.tabs.create({url: globalUrl[tab.id], active: true});
};

chrome.pageAction.onClicked.addListener(createNewTab);

var bookMatch = function(title1, author1, title2, author2, authorList) {
    var _title1 = stripTitle(title1).toUpperCase();
    var _title2 = stripTitle(title2).toUpperCase();
    var _author1 = cleanUpName(author1);
    var _author2 = cleanUpName(author2);
    var _author1LastName = getLastNameOrName(author1).toUpperCase();
    var _author2LastName = getLastNameOrName(author2).toUpperCase();
    return (startsWith(_title1, _title2) || startsWith(_title2, _title1)) && (_author1LastName === _author2LastName || _author1 === _author2 || contains(authorList, _author1));
};

var getLastNameOrName = function(author) {
    author = cleanUpName(author);
    var lastNameRegex = /\w+$/;
    var matches = lastNameRegex.exec(author);
    if (matches != null && matches.length > 0 && matches[0] != null) {
        return matches[0]
    }
    return author
};

var cleanUpName = function(author) {
    var htmlTagRegex = /(<([^>]+)>)/ig;
    var multipleAuthorsRegex = /,.*$/;
    return author.replace(htmlTagRegex, "").replace(multipleAuthorsRegex, "").toUpperCase();
};

var stripTitle = function(title) {
    var htmlTagRegex = /(<([^>]+)>)/ig;
    var parenRegex = / \(.+\)$/;
    var subtitleRegex = /:.*$/;
    return title.replace(htmlTagRegex, "").replace(parenRegex, "").replace(subtitleRegex, "");
};

var stripParens = function(title) {
    var htmlTagRegex = /(<([^>]+)>)/ig;
    var parenRegex = / \(.+\)$/;
    return title.replace(htmlTagRegex, "").replace(parenRegex, "");
};

var getQuery = function(title, author) {
    return encodeURIComponent(stripParens(title) + " " + getLastNameOrName(author));
};

var startsWith = function(str, prefix) {
    return str.indexOf(prefix) === 0;
};

var contains = function(str, fragment) {
    return str.indexOf(fragment) > -1;
};

var checkForMatch = function(tab, data) {
    var title = data.title;
    var author = data.author;
    var authorList = data.authorList;
    var subtitleRegex = /:.*$/;
    var url = 'https://www.scribd.com/autocomplete?l=1&c=128&c_code=US&nl=1&search_version=single_list_autocomplete_ui&q=' + getQuery(title, author);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type','application/json');
    xhr.onreadystatechange = function() {
        if (xhr.status === 200 && this.readyState === 4) {
            response = JSON.parse(xhr.responseText);
            var books = [];
            if (response.sections != null) {
                for (var i = 0; i < response.sections.length; i++) {
                    if (response.sections[i].type === "books") {
                        books = response.sections[i].value;
                    }
                }
            }
            for (var i = 0; i < books.length; i++) {
                var book = books[i];
                var _title = book.title;
                var _author = book.author;
                var _id = book.id;
                var url = 'https://www.scribd.com/book/' + _id;
                if (bookMatch(_title, _author, title, author, authorList)) {
                    chrome.pageAction.show(tab.id);
                    globalUrl[tab.id] = url;
                    break;
                }
            }
        }
    };
    xhr.send();
};

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        checkForMatch(sender.tab, request.data)
    }
);
