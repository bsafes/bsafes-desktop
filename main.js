const TabGroup = require('electron-tabs');
const dragula = require('dragula');

let tabGroup = new TabGroup({
    // newTab: {
    //     title: 'BSafes',
    //     icon: 'fa fa-search'
    // },
    //closeButtonText: '&#x2715;',
    ready: tabGroup => {
        dragula([tabGroup.tabContainer], {
            direction: 'horizontal'
        });
    }
});

let tab = tabGroup.addTab({
    title: 'Local',
    src: 'views/Local.html',
    webviewAttributes: {
        'nodeintegration': true
    },
    icon: 'fa fa-home',
    visible: true,
    closable: false,
    active: true,
    ready: tab => {
        // Open dev tools for webview
        let webview = tab.webview;
        if (!!webview) {
            webview.addEventListener('dom-ready', () => {
                //webview.openDevTools();
            })
        }
    }
});

tabGroup.addTab({
    title: 'BSafes.com',
    src: 'views/BSafes.com.html',
    webviewAttributes: {
        'nodeintegration': true
    },
    icon: 'fa fa-home',
    visible: true,
    closable: false,
    active: true,
    ready: tab => {
        // Open dev tools for webview
        let webview = tab.webview;
        if (!!webview) {
            webview.addEventListener('dom-ready', () => {
                //webview.openDevTools();
            })
        }
    }
});

tabGroup.addTab({
    title: 'Downloads',
    src: 'views/Downloads.html',
    webviewAttributes: {
        'nodeintegration': true
    },
    icon: 'fa fa-home',
    visible: true,
    closable: false,
    active: true,
    ready: tab => {
        // Open dev tools for webview
        let webview = tab.webview;
        if (!!webview) {
            webview.addEventListener('dom-ready', () => {
                //webview.openDevTools();
            })
        }
    }
});

const { ipcRenderer } = require('electron');

ipcRenderer.on('show-message', (event, msg) => {

    let tab = tabGroup.addTab({
        title: `Title: ${msg}`,
        src: `./content.html?message=${msg}`,
        webviewAttributes: {
            'nodeintegration': true
        },
        icon: 'fa fa-comment',
        visible: true,
        active: true,
        ready: tab => {
            // Open dev tools for webview
            let webview = tab.webview;
            if (!!webview) {
                webview.addEventListener('dom-ready', () => {
                    webview.openDevTools();
                })
            }
        }
    });
})