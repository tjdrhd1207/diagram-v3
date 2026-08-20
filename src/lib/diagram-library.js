/*
 * @preserve
 * @summary Hansol Diagram Library.
 * @file diagram-min.js (diagram library source file)
 * @author Kimjaemin <jaeminkim@hansol.com>
 * @author Kimsejin <kimsejin@hansol.com>
 * @version 1.1.23
 *
 * © 2022 Kimsejin <kimsejin@hansol.com>, Kimjaemin <jaeminkim@hansol.com>
 * @endpreserve
 */

const DEBUG = true;
const VERSION = '0.1-beta';
const META_VERSION = 1;
const NORMAL_DIAGRAM_TYPE = 'Normal';
const CUSTOM_DIAGRAM_TYPE = 'Custom';
const EVENT_NODE_CLICKED = 'onNodeClicked';
const EVENT_NODE_CREATED = 'onNodeCreated';
const EVENT_NODE_SELECTED = 'onNodeSelected';
const EVENT_NODE_UNSELECTED = 'onNodeUnSelected';
const EVENT_NODE_CHANGED = 'onNodeChanged';
const EVENT_ZOOMED = 'onZoomed';
const EVENT_DIAGRAM_MODIFIED = 'onDiagramModified';
const EVENT_LINK_CREATING = 'onLinkCreating';
const EVENT_NODE_MODIFYING_CAPTION = 'onNodeModifyingCaption';
const EVENT_NODE_MODIFYING_COMMENT = 'onNodeModifyingComment';
const DEFAULT_SHAPE = 'Rectangle';
const RECT_BLOCK_SHAPE = 'Rectangle';
const CIRCLE_BLOCK_SHAPE = 'Circle';
const DIAMOND_BLOCK_SHAPE = 'Diamond';
// 블럭의 크기는 아래와 같이 고정한다. 크기 변경 기능은
// 현재는 고려하지 않는다. 기존의 시나리오 변환시에는
// 기존의 크기를 잃어버리고 새 크기로 변환된다.
const BLOCK_RECT_DEFAULT_WIDTH = 140;
const BLOCK_RECT_DEFAULT_HEIGHT = 60;
const BLOCK_CIRCLE_RADIUS = 35;
const BLOCK_DIAMOND_DEFAULT_RADIUS = 50;
const BLOCK_FONT_SIZE = 13;
const BLOCK_CHANGE_SIZE = 20;
const MEMO_DEFAULT_WIDTH = 300;
const MEMO_DEFAULT_HEIGHT = 300;
const DEFAULT_ADJ_DIST = 80;
const MIN_DISTANCE = 40;
const CUSTOM_BLOCK_MENU_WIDTH = 70;
const CUSTOM_BLOCK_MENU_HEIGHT = 30;
const CUSTOM_EVENT_HEIGHT = 25;
const ANCHOR_RADIUS = 6;
const CUSTOM_EVENT_BLOCK = 'customEventBlock';
const CUSTOM_BLOCK = 'CustomBlock';
const BLOCK_MENU_ICON = 'blockMenuIcon';
const L_POSITION = 'L';
const R_POSITION = 'R';
const T_POSITION = 'T';
const B_POSITION = 'B';
const MEMO_MENU_SIZE = 40;
const MEMO_COLOR_LIST = [
    // Primary
    { fill: 'rgb(0, 123, 255)', offset: 0 },
    // Secondary
    { fill: 'rgb(108, 117, 125)', offset: 1 },
    // Success
    { fill: 'rgb(40, 167, 69)', offset: 2 },
    // Danger
    { fill: 'rgb(220, 53, 69)', offset: 3 },
    // Warning
    { fill: 'rgb(255, 193, 7)', offset: 4 },
    // Info
    { fill: 'rgb(23, 162, 184)', offset: 5 },
    // Light
    { fill: 'rgb(248, 249, 250)', offset: 6 },
    // Dark
    // { fill: 'rgb(52, 58, 64)', offset: 7, color: 'white' },
];
const MEMO_STROKE_WIDTH = '1';
const HELPLINE_STROKE_WIDTH = 3;
const ADD_CUSTOM_EVENT = 'addEvent';

const ModifyEventTypes = Object.freeze({
    // 로깅시에 쉽게 상수를 인식할 수 있도록 값을 부여한다.
    LinkAdded: 'ModifyEventTypes.LinkAdded',
    LinkArranged: 'ModifyEventTypes.LinkArranged',
    LinkRemoved: 'ModifyEventTypes.LinkRemoved',
    NodeAdded: 'ModifyEventTypes.NodeAdded',
    NodeRemoved: 'ModifyEventTypes.NodeRemoved',
    NodeMoved: 'ModifyEventTypes.NodeMoved',
    NodeCaptionModified: 'ModifyEventTypes.NodeCaptionModified',
    NodeCommentModified: 'ModifyEventTypes.NodeCommentModified',
    MemoAdded: 'ModifyEventTypes.MemoAdded',
    MemoRemoved: 'ModifyEventTypes.MemoRemoved',
    MemoMoved: 'ModifyEventTypes.MemoMoved',
    MemoContentModified: 'ModifyEventTypes.MemoContentModified',
    NodeMouseUp: 'ModifyEventTypes.NodeMouseUp',
    NodeResized: 'ModifyEventTypes.NodeResized',
});

const KeyActionNames = Object.freeze({
    // 로깅시에 쉽게 상수를 인식할 수 있도록 값을 부여한다.
    Escape: 'KeyActionNames.Escape',
    Delete: 'KeyActionNames.Delete',
    SelectAll: 'KeyActionNames.SelectAll',
    Copy: 'KeyActionNames.Copy',
    Paste: 'KeyActionNames.Paste',
    Cut: 'KeyActionNames.Cut',
    Undo: 'KeyActionNames.Undo',
    Redo: 'KeyActionNames.Redo',
    SetBookmark: 'KeyActionNames.SetBookmark',
    JumpBookmark: 'KeyActionNames.JumpBookmark',
    GrabAndZoom: 'KeyActionNames.GrabAndZoom',
    IncreaseHeight: 'KeyActionNames.IncreaseHeight',
    DecreaseHeight: 'KeyActionNames.DecreaseHeight',
    IncreaseWidth: 'KeyActionNames.IncreaseWidth',
    DecreaseWidth: 'KeyActionNames.DecreaseWidth',
});

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
// 0: Main button pressed, usually the left button or the un-initialized state
// 1: Auxiliary button pressed, usually the wheel button or the middle button(if present)
// 2: Secondary button pressed, usually the right button
// 3: Fourth button, typically the Browser Back button
// 4: Fifth button, typically the Browser Forward button
// const MOUSE_BUTTON_LEFT_MAIN = 0;
// const MOUSE_BUTTON_MIDDLE = 1;
// const MOUSE_BUTTON_RIGHT = 2;

const MOUSE_BUTTON_NONE = 0;
const MOUSE_BUTTON_PRIMARY = 1;
const MOUSE_BUTTON_SECONDARY = 2;
const MOUSE_BUTTON_AUX = 4;

const LOCK_OFF = 0; // 기본모드
const LOCK_ON = 1; // 블럭,링크,메모 선택/해제를 제외한 모든 기능 불가.
const LOCK_MAX = 10; // 모든 기능 사용 불가.

let diagramSeq = 0;
let diagrams = new Map();

/**
 * 마우스 포인터가 SVG 상의 어느 한 지점에 있을 때, 이 지점의 SVG ViewBox 좌표계상의 좌표를 반환한다.
 * 이 좌표는 SVG 내에서만 유효하다. 실제 모니터나, 브라우저의 document 좌표와는 다를 수 있다.
 * @example
 * element.addEventListener("click", function (e) {
 *  const offset = __getMousePosition(e.target, e.clientX, e.clientY);
 * }
 * @param {object} evt mouse event
 * @returns {object} mouse position object {x, y}
 */
function __getMousePosition(target, x, y) {
    // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX
    // e.screenX, e.screenY: 모니터 화면상에서의 위치.
    // e.clientX, e.clientY: browser document 상에서의 위치. (특정 Element 가 아님)
    if (!target.getScreenCTM) {
        // foreignobject 들은 getScreenCTM 이 없을 수 있다.
        return { x: 0, y: 0 };
    }
    let CTM = target.getScreenCTM();
    // getScreenCTM() 은 SVG element 에서만 유효한 것으로 보임. SVGMatrix 를 반환한다.
    return {
        x: (x - CTM.e) / CTM.a,
        y: (y - CTM.f) / CTM.d
    };
}

function assertSetEquals(setA, setB) {
    return setA.size === setB.size && setA.union(setB).size === setA.size;
};

/**
 * @example
 * let elm = __makeSvgElement('text', {'x': 10, 'y': 30, 'style': 'pointer-events: none'}, ['svg-text', 'svg-debug-text']);
 * @param {string} tag svg element name
 * @param {object} attrs svg element attributes
 * @param {list} classes svg element class names
 * @returns {object} svg element
 */
function __makeSvgElement(tag, attrs, classes) {
    let elm = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
        __setSvgAttrs(elm, attrs);
    }
    if (classes) {
        classes.forEach((c) => elm.classList.add(c));
    }
    return elm;
}

function __makeSvgTextElement(w, h, fontSize, text) {
    let textElement = __makeSvgElement('foreignObject', {
        width: w,
        height: h,
        style: 'pointer-events: none;'
    }, []);

    let textArea = document.createElement('div');
    textArea.className = 'svg-text';
    textArea.contentEditable = false;
    textArea.style.cssText = `white-space: pre; width: 100%; height: 100%; padding: 5px; font-size: ${fontSize}px;`;
    textArea.style.overflow = 'hide';
    textArea.style.pointerEvents = 'none';
    textArea.innerHTML = text;
    textElement.appendChild(textArea);
    return textElement;
}

/**
 * @example
 * __setSvgAttrs((svgElement, {'cx': x, 'cy': y});
 * @param {object} elm svg element
 * @param {object} attrs svg element attributes
 */
function __setSvgAttrs(elm, attrs) {
    if (attrs) {
        Object.keys(attrs).forEach((k) => elm.setAttributeNS(null, k, attrs[k]));
    }
    return elm;
}

const convertAnchorPosition = { 0: L_POSITION, 1: T_POSITION, 2: R_POSITION, 3: B_POSITION, default: R_POSITION };
const reverseAnchorPosition = { L: '0', T: '1', R: '2', B: '3', };

/*
 * case-insensitive
 */
function getHtmlAttribute(element, name) {
    // HTMLElement.attributes:
    //  => NamedNodeMap{ 0: type, 1: id, 2: value, 3: size, ... }
    for (let attr of element.attributes) {
        if (attr.name.toLowerCase() === name.toLowerCase()) {
            return attr.value;
        }
    }
    return null;
}

/*
 * case-insensitive
 */
function setHtmlAttribute(element, name, value) {
    // HTMLElement.attributes:
    //  => NamedNodeMap{ 0: type, 1: id, 2: value, 3: size, ...}
    let isset = false;
    for (let attr of element.attributes) {
        if (attr.name.toLowerCase() === name.toLowerCase()) {
            attr.value = value;
            isset = true;
            break;
        }
    }
    if (!isset) {
        element.setAttribute(name, value);
    }
}

/*
 * 주어진 두 Object 를 합친다. (deep)
 * 동일한 이름의 property 는 source 에 있는 값으로 override 한다.
 */
function mergeDeep(target, source) {
    // this.options = Object.assign({ ...Diagram.defaultOptions }, options);
    let merged = {};
    let keys = new Set([...Object.keys(target), ...Object.keys(source)]);
    for (let key of keys) {
        if (!(key in source)) {
            merged[key] = target[key];
        } else if (!(key in target)) {
            merged[key] = source[key];
        } else {
            if (target[key] instanceof Object && source[key] instanceof Object) {
                merged[key] = mergeDeep(target[key], source[key]);
            } else {
                merged[key] = source[key];
            }
        }
    }
    return merged;
}

// static inline style
let STYLE_TEXT = `
    .svg-text {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -o-user-select: none;
        user-select: none;
    }
    .draggable {
        cursor: move;
    }
    .connect-block {
        // fill: #ffc107 !important;
        // animation: blink 1.5s infinite;
    }
    .fm-wrapper {
        position: absolute;
        visibility: hidden;
        width: 200px;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.1)
    }

    .fm-wrapper .fm-menu {
        list-style-type: none;
        padding: 10px 10px;
        margin-bottom: 0px;
    }
    
    .fm-wrapper .fm-item {
        font-size: 15px;
        border-radius: 5px;
        padding: 5px 5px;
    }

    .fm-wrapper .fm-item span {
        padding-left: 10px;
    }

    .fm-wrapper .fm-item:hover {
        background: #3b52c4;
    }

    @keyframes blink {
        0% { opacity: 1; }
        25% { opacity: 0.7; }
        50% { opacity: 0.5; }
        75% { opacity: 0.7; }
        100% { opacity: 1; }
    }
    .hd-block2 {
        fill: #ededed;
        stroke: #888888;
        stroke-width: 1;
        /* https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow
        * length(우측으로이동) length(아래로이동) blur크기 blur세기
        */
        filter: drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.5));
    }
    .hd-block2-iconarea {
        background-color: #ababab;
    }
    .hd-block2:hover {
        fill: #999999;
        stroke: #000000;
        stroke-width: 2;
        stroke-dasharray: 3;
        stroke-dashoffset: 6;
        animation: dash 5s linear infinite;
    }

    @keyframes dash {
        to {
            stroke-dashoffset: -20;
        }
    }
    .hd-block2-selected {
        fill: #faf9f7;
        stroke: #000000;
        stroke-width: 2;
        stroke-dasharray: 3;
        stroke-dashoffset: 6;
    }
    .hd-group {
        fill: rgb(100, 100, 100);
        fill-opacity: 0.1;
        stroke: rgb(100, 100, 100);
        stroke-width: 1;
        stroke-opacity: 0.1;
    }
    .hd-block {
        fill: #ebebeb;
        stroke: rgb(68, 155, 112);
        stroke-width: 1;
    }
    .hd-block:hover {
        fill: rgb(176, 246, 212);
    }
    .hd-block-selected {
        stroke: red;
        stroke-width: 5;
    }
    .hd-link {
        fill: none;
        stroke: gray;
        stroke-width: 2;
        stroke-linejoin: arcs;
        stroke-linecap: round;
    }
    .hd-link-thick {
        stroke-width: 4px;
    }
    @keyframes dash {
        from {
            stroke-dashoffset: 100;
        }
    }
    .hd-link-selected {
        fill: none;
        stroke: black;
        stroke-width: 2;
        stroke-dasharray: 5;
        stroke-dashoffset: 10;
        animation: dash 6s linear forwards 1;
        animation-iteration-count: 1000;
    }
    .hd-link-text {
        font-weight: normal;
    }
    .hd-link-text-selected {
        font-weight: bold;
    }
    .deleteIconEvent:hover {
        opacity: 0.5;
        cursor: pointer;
    }
    .markConnectedLink {
        fill: red;
    }

    @keyframes blink-effect {
        50% {
            opacity : 0.8;
            fill : skyblue;
        }
    }

    @keyframes blinkLine-effect {
        50% {
            opacity : 1;
            stroke : skyblue;
            stroke-width: 3;
        }
    }
    .blink {
        animation : blink-effect 1s ease-in-out infinite;
    }
    .blinkLine {
            stroke : skyblue;
            stroke-width: 4;
    }

`;

/**
 * @example
 * let diagram = new Diagram('#mysvg');
 * @param {string} svgSelector jquery selector for svg element
 * @returns {object} diagram object
 */
class Diagram {
    /**
     * @param {string} svgSelector
     * @param {object} meta
     * @param {object} options
     */
    constructor(svgSelector, meta, options) {
        const id = String(diagramSeq++);
        const svg = document.querySelector(svgSelector);

        // 가장 먼저 아래와 같은 정리작업을 해주어야 한다:
        // 동일한 SVG DOM Element 에 대해서 Diagram 이 다시 만들어진다면
        // SVG 가 가지고 있는 Child Element 들과 이전에 등록된 이벤트
        // 핸들러들을 모두 제거해 주어야 한다.
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        if (svg.handlerList) {
            for (let eventName in svg.handlerList) {
                svg.removeEventListener(eventName, svg.handlerList[eventName]);
            }
        }

        let _style = document.createElement('style');
        _style.innerHTML = STYLE_TEXT;
        svg.appendChild(_style);

        this.id = id;
        this.svg = svg;
        this.meta = meta;
        this.options = mergeDeep(Diagram.defaultOptions, options);
        this.components = new Map();
        this.markerId = id + '-marker';
        this.creatingLinkOrigin = null;
        this.creatingLinkLine = null;
        this.creatingNodeName = null;
        this.bookmarks = [];
        this.dragStart = null;
        this.selectionBox = null;
        this.actionManager = new ActionManager(this);
        this.selectedItems = [];
        this.eventMap = new Map();
        this.svgDragInfo = { x: -1, y: -1 };
        this.grabDown = false;
        this.ready = false;
        this.nextSeq = 0;
        this.bookmarkMap = new Map();
        this.keyTracking = new Set();
        this.keyActions = {}; // ActionName => Set of KeyboardEvent.key
        this.lockLevel = LOCK_OFF;
        this.mousePosition = null;
        this.shapeChangeLink = null;
        this.contextMenu = false;
        this.blink = {
            linkArray: new Set(),
            on: false
        };

        svg.dataset.id = id;
        this.activeAnchor = null;
        this.movingLine = null;

        this.blinkOriginBlock = null;
        this.blinkDestBlock = null;

        if (this.options.lineType !== NORMAL_DIAGRAM_TYPE && this.options.lineType !== CUSTOM_DIAGRAM_TYPE) {
            throw new Error('line Type is not supported');
        }

        if (!(this.meta && this.meta.version >= META_VERSION)) {
            throw new Error('No meta object or meta version not supported');
        }

        // Marker for link arrows
        {
            const marker = __makeSvgElement('marker', {
                class: 'marker',
                id: this.markerId,
                viewBox: '0 0 10 10',
                refX: 11,
                refY: 5,
                markerWidth: 8,
                markerHeight: 8,
                orient: 'auto-start-reverse',
                markerUnits: 'userSpaceOnUse' // link hover 시점에서 marker의 크기를 확대시키지 않기 위해
            });
            marker.appendChild(__makeSvgElement('path', { d: 'M 0 0 L 11 5 L 0 10 Z' }));
            svg.appendChild(marker);
        }

        if (options.useBackgroundPattern === true) {
            this._setBackgroundPattern();
        }

        if (options.minimapQuerySelector) {
            const style = getComputedStyle(svg);
            let vpw = parseFloat(style.width);
            let vph = parseFloat(style.height);

            const minimap = document.querySelector(options.minimapQuerySelector);
            const minimapStyle = getComputedStyle(minimap);
            minimap.setAttribute('width', minimapStyle.width);
            minimap.setAttribute('height', minimapStyle.height);
            minimap.setAttribute('viewBox', `0 0 ${vpw} ${vph}`);
            // let minimapRect = __makeSvgElement('rect', {width: '1400', height: '400', fill: 'black', stroke: 'red', opacity: '0.3'});
            // minimap.appendChild(minimapRect);
        }

        /* keydown 이벤트가 발생하기 위해 svg에 포커싱 */
        if (!getHtmlAttribute(svg, 'tabindex')) {
            setHtmlAttribute(svg, 'tabindex', '0');
        }

        this._registerEvent(EVENT_NODE_CLICKED, options.onNodeClicked);
        this._registerEvent(EVENT_NODE_CREATED, options.onNodeCreated);
        this._registerEvent(EVENT_NODE_SELECTED, options.onNodeSelected);
        this._registerEvent(EVENT_NODE_UNSELECTED, options.onNodeUnSelected);
        this._registerEvent(EVENT_ZOOMED, options.onZoomed);
        this._registerEvent(EVENT_DIAGRAM_MODIFIED, options.onDiagramModified);
        this._registerEvent(EVENT_LINK_CREATING, options.onLinkCreating);
        this._registerEvent(EVENT_NODE_MODIFYING_CAPTION, options.onNodeModifyingCaption);
        this._registerEvent(EVENT_NODE_MODIFYING_COMMENT, options.onNodeModifyingComment);
        this._registerEvent(EVENT_NODE_CHANGED, options.onNodeChanged);

        // SVG (DOM Element) 에 handlerList 라는 object 를 저장한다.
        // 이 object 에는 SVG 에 등록한 이벤트 핸들러의 목록이 들어있다.
        // 나중에 이 SVG 가 재사용되는 경우에 해당 이벤트 핸들러들의
        // 참조를 사용해 기존 핸들러들을 정리해주기 위함이다.
        // 앞으로 추가되는 이벤트 핸들러들도 이러한 과정을 따라 주어야 한다.
        svg.handlerList = {
            contextmenu: e => this._contextmenu(e),
            mousedown: e => this._mousedown(e),
            mousemove: e => this._mousemove(e),
            mouseup: e => this._mouseup(e),
            click: e => this._mouseclick(e),
            mousewheel: e => this._mousescroll(e),
            keydown: e => this._keydown(e),
            keyup: e => this._keyup(e),
            blur: e => this._blur(e),
        };

        svg.addEventListener('contextmenu', svg.handlerList.contextmenu);
        svg.addEventListener('mousedown', svg.handlerList.mousedown);
        svg.addEventListener('mousemove', svg.handlerList.mousemove);
        svg.addEventListener('mouseup', svg.handlerList.mouseup);
        svg.addEventListener('click', svg.handlerList.click);
        svg.addEventListener('mousewheel', svg.handlerList.mousewheel);
        svg.addEventListener('keydown', svg.handlerList.keydown);
        svg.addEventListener('keyup', svg.handlerList.keyup);
        svg.addEventListener('blur', svg.handlerList.blur);

        // KeyCombination 을 정의할 때 Control+c 와 같은 형식을
        // 사용하지 않고 배열을 사용한다. 어떠한 키도 ("+" 처럼) 유효한
        // 값이 될 수 있기 때문에 delimeter 방식을 사용하지 않도록 한다.
        // 등록할 때 Key 이름은 대소문자를 구별한다. KeyboardEvent.key 에 해당한다.
        this._registerKeyAction(KeyActionNames.Escape, ['Escape']);
        this._registerKeyAction(KeyActionNames.Delete, ['Delete']);
        this._registerKeyAction(KeyActionNames.SelectAll, ['Control', 'a']);
        this._registerKeyAction(KeyActionNames.Copy, ['Control', 'c']);
        this._registerKeyAction(KeyActionNames.Paste, ['Control', 'v']);
        this._registerKeyAction(KeyActionNames.Cut, ['Control', 'x']);
        this._registerKeyAction(KeyActionNames.Undo, ['Control', 'z']);
        this._registerKeyAction(KeyActionNames.Redo, ['Control', 'r']);
        this._registerKeyAction(KeyActionNames.SetBookmark, ['Alt', '1']);
        this._registerKeyAction(KeyActionNames.JumpBookmark, ['Control', '1']);
        this._registerKeyAction(KeyActionNames.GrabAndZoom, ['Control']);
        this._registerKeyAction(KeyActionNames.IncreaseHeight, ['ArrowDown']);
        this._registerKeyAction(KeyActionNames.DecreaseHeight, ['ArrowUp']);
        this._registerKeyAction(KeyActionNames.IncreaseWidth, ['ArrowRight']);
        this._registerKeyAction(KeyActionNames.DecreaseWidth, ['ArrowLeft']);

        if (options.keyActions) {
            for (let action in options.keyActions) {
                let keyCombo = options.keyActions[action];
                // 기본값이 있는 경우 사용자 설정으로 덮어써진다.
                this._registerKeyAction(action, keyCombo);
            }
        }

        diagrams.set(id, this);
    }

    _registerEvent(eventName, f) {
        if (!f) {
            return;
        }
        let listeners = this.eventMap.get(eventName);
        if (!listeners) {
            this.eventMap.set(eventName, listeners = []);
        }
        listeners.push(f);
    }

    lock(level) {
        if (!Number.isInteger(level)) {
            throw new Error('Invalid level: ' + level);
        }
        this.lockLevel = level;
    }

    isLocked() {
        return this.lockLevel > LOCK_OFF;
    }

    isSelected(item) {
        return this.selectedItems.includes(item);
    }

    appendToSelection(item) {
        this.selectedItems.push(item);
    }

    removeFromSelection(item) {
        let idx = this.selectedItems.findIndex((t) => t === item);
        this.selectedItems.splice(idx, 1);
    }

    clearSelection(excludeItem) {
        let items = [...this.selectedItems];
        items.forEach(function (item) {
            if (item !== excludeItem) {
                item.unselect();
            }
        });
    }

    createNode(nodeName, x, y) {
        if (this.isLocked()) {
            return;
        }
        let memoDefaultSize = { width: 0, height: 0 };
        if (this.options.nodeSize) {
            memoDefaultSize = this.options.nodeSize.memo;
        }
        let offset = __getMousePosition(this.svg, x, y);
        if (nodeName === '[MEMO]') {
            let memo = new Memo(this,
                this.generateId(),
                offset.x,
                offset.y,
                memoDefaultSize.width || MEMO_DEFAULT_WIDTH,
                memoDefaultSize.height || MEMO_DEFAULT_HEIGHT,
                '');
            this.actionManager.append(ActionManager.COMPONENTS_ADDED, [memo]);
        } else {
            let nodeInfo = this.meta.nodes[nodeName];
            if (!nodeInfo) {
                throw new Error('Invalid node name: ' + nodeName);
            }
            let block = Block.createInstance(this,
                this.generateId(),
                nodeInfo.shape || DEFAULT_SHAPE,
                nodeInfo.icon,
                nodeName,
                nodeInfo.displayName,
                '', // comment
                offset.x,
                offset.y,
                null, // w
                null, // h
                null // userData
            );
            this.actionManager.append(ActionManager.COMPONENTS_ADDED, [block]);
        }
    }

    copy() {
        if (!window.navigator.clipboard) {
            alert('클립보드 기능이 활성화 되어있지 않습니다.');
            return;
        }

        let rootNode = new NodeWrapper('scenario');
        this.selectedItems.forEach((item) => {
            if (item.type === 'B') { // TODO: 메모 copy&paste 향후 추가
                let blockNode = rootNode.appendChild('block');
                Block.serialize(item, blockNode);
            } else if (item.type === 'M') {
                let memoNode = rootNode.appendChild('memo');
                Memo.serialize(item, memoNode);
            }
        });
        let xmlText = rootNode.toString(true);
        window.navigator.clipboard.writeText(xmlText)
            .catch((e) => {
                alert('클립보드 사용시 오류가 발생했습니다.');
                console.error(e);
            });
    }

    generateId() {
        for (let i = this.nextSeq; ; i++) {
            const id = String(i).padStart(8, '0');
            if (!this.components.get(id)) {
                this.nextSeq = i + 1;
                return id;
            }
        }
    }

    paste() {
        if (this.isLocked()) {
            return;
        }
        if (!window.navigator.clipboard) {
            alert('클립보드 기능이 활성화 되어있지 않습니다.');
            return;
        }

        let map = new Map();
        window.navigator.clipboard.readText().then((clipText) => {
            let rootNode = NodeWrapper.parseFromXML(clipText);

            // 1) 생성되는 위치는 마우스의 위치임.
            //    마우스를 이동하지 않고 두번 이상 paste 부터는 위치 중첩됨.
            // 2) 마우스의 위치를 알 수 없는 경우에는 기존 블럭에서 위, 아래 10 씩
            //    이동한 위치에 생성함. 두번이상 paste 부터는 위치가 중첩해서 생김.
            let moveX = 10;
            let moveY = 10;
            if (this.mousePosition) {
                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;
                for (let node of rootNode.children('block')) {
                    let bounds = node.child('svg/bounds').value();
                    let [x, y, w, h] = bounds.split(',');
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, +x + +w);
                    maxY = Math.max(maxY, +y + +h);
                }
                for (let node of rootNode.children('memo')) {
                    let bounds = node.child('svg/bounds').value();
                    let [x, y, w, h] = bounds.split(',');
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, +x + +w);
                    maxY = Math.max(maxY, +y + +h);
                }
                let centerX = minX + (maxX - minX) / 2;
                let centerY = minY + (maxY - minY) / 2;
                moveX = this.mousePosition.x - centerX;
                moveY = this.mousePosition.y - centerY;
            }

            let first = true;
            let undoItems = [];
            for (let node of rootNode.children('block')) {
                if (first) {
                    this.unselectAll();
                    first = false;
                }
                let nodeName = node.attr('meta-name');
                let nodeInfo = this.meta.nodes[nodeName];
                let isStartNode = nodeInfo.isStartNode;
                if (isStartNode) {
                    alert('시작 블럭은 복사할 수 없습니다.');
                    continue;
                }

                if (!nodeInfo) {
                    throw new Error('Invalid node name: ' + nodeName);
                }
                let nodeCaption = node.attr('desc');
                let nodeComment = node.attr('comment');
                let nodeId = node.attr('id');
                let bounds = node.child('svg/bounds').value();
                let [x, y, w, h] = bounds.split(',');
                let userData = node.child(nodeInfo.buildTag);
                let bgColor = node.attr('bg-color');
                let iconColor = node.attr('icon-color');
                let color = { bgColor, iconColor };
                let newBlock = Block.createInstance(this,
                    this.generateId(),
                    nodeInfo.shape || DEFAULT_SHAPE,
                    nodeInfo.icon,
                    nodeName,
                    nodeCaption,
                    nodeComment,
                    parseFloat(x) + moveX,
                    parseFloat(y) + moveY,
                    parseFloat(w),
                    parseFloat(h),
                    userData,
                    event,
                    color
                );
                newBlock.select();
                map.set(nodeId, newBlock);
                undoItems.push(newBlock);
            }

            for (let node of rootNode.children('block')) {
                let nodeId = node.attr('id');
                if (!map.get(nodeId)) {
                    continue;
                }
                for (let nodeSub of node.children('choice')) {
                    let targetId = nodeSub.attr('target');
                    let targetNode = map.get(targetId);

                    if (targetNode) {
                        let originAnchor = nodeSub.attr('svg-origin-anchor');
                        let destAnchor = nodeSub.attr('svg-dest-anchor');
                        let newLink = new Link(this,
                            this.generateId(),
                            nodeSub.attr('event'),
                            map.get(nodeId),
                            map.get(targetId),
                            convertAnchorPosition[originAnchor],
                            convertAnchorPosition[destAnchor],
                            true
                        );
                        undoItems.push(newLink);
                    }
                }
            }

            for (let node of rootNode.children('memo')) {
                if (first) {
                    this.unselectAll();
                    first = false;
                }
                let text = node.child('text').value();
                let bounds = node.child('svg/bounds').value();
                let [x, y, w, h] = bounds.split(',');
                let newMemo = new Memo(
                    this,
                    this.generateId(),
                    parseFloat(x) + moveX,
                    parseFloat(y) + moveY,
                    parseFloat(w),
                    parseFloat(h),
                    text);
                undoItems.push(newMemo);
            }

            if (undoItems.length > 0) {
                this.actionManager.append(ActionManager.COMPONENTS_ADDED, undoItems);
            }
        }).catch((e) => {
            alert('클립보드 사용 시 오류가 발생했습니다.');
            console.error(e);
        });
    }

    cut() {
        this.copy();
        this.delete();
    }

    delete() {
        if (this.isLocked()) {
            return;
        }
        let hasStartNode = false;
        this.selectedItems.forEach(item => {
            if (item.type === 'B') {
                let nodeInfo = this.meta.nodes[item.metaName];
                if (nodeInfo.isStartNode) {
                    hasStartNode = true;
                }
            }
        });

        if (hasStartNode) {
            if (this.selectedItems.length === 1) {
                alert('선택한 블럭은 삭제할 수 없습니다.');
            } else {
                alert('선택한 블럭중에 삭제할 수 없는 블럭이 포함되어 있습니다.');
            }
        } else {
            let undoItems = [];
            // 아래와 같이 제거 로직이 복잡한 이유는 다시 복구할 때 필요한 정보들 때문임.
            // 링크를 먼저 제거해야 Undo 할 때 제대로 복구할 수 있다.

            // 선택된 링크들을 모두 제거.
            let selectedItems = [...this.selectedItems];
            selectedItems.filter(item => item.type === 'L').forEach(item => {
                if (item.blockOrigin.type === CUSTOM_EVENT_BLOCK) {
                    item.blockOrigin.link = null;
                }
                item.remove();
                undoItems.push(item);
            });

            // 링크중에 선택되진 않았지만 블럭을 제거하면서 자동 제거될 것들을 미리 제거.
            selectedItems.filter(item => item.type === 'B').forEach(item => {
                for (let link of item.links.values()) {
                    if (this.options.debugMode) {
                        console.log(link);
                    }
                    link.remove();
                    undoItems.push(link);
                }
            });

            // 최종적으로 Block, Memo 들을 제거.
            selectedItems.filter(item => item.type !== 'L').forEach(item => {
                item.remove();
                undoItems.push(item);
            });

            this.clearSelection();
            this.actionManager.append(ActionManager.COMPONENTS_REMOVED, undoItems);
        }
    }

    undo() {
        if (this.isLocked()) {
            return;
        }
        this.actionManager.undo();
    }

    redo() {
        if (this.isLocked()) {
            return;
        }
        this.actionManager.redo();
    }

    /**
     * @param {String} type Horizontal-Alignment: start/center/end,
     * Vertical-Alignment: top/middle/bottom, Horizental-Space-Align: halign, Vertical-Space-Align: valign
     */
    align(type) {
        if (this.isLocked()) {
            return;
        }
        let blocks = this.selectedItems.filter(item => item.type === 'B');
        let count = blocks.length;
        if (count <= 1) {
            return;
        }

        let undoData = { type, actions: [] };
        let leftMost = Infinity;
        let rightMost = -Infinity;
        let topMost = Infinity;
        let bottomMost = -Infinity;
        let wsum = 0;
        let hsum = 0;
        let minCenterX = Infinity;
        let maxCenterX = -Infinity;
        let minCenterY = Infinity;
        let maxCenterY = -Infinity;
        for (let block of blocks) {
            leftMost = Math.min(leftMost, block.x);
            rightMost = Math.max(rightMost, block.x + block.w);
            topMost = Math.min(topMost, block.y);
            bottomMost = Math.max(bottomMost, block.y + block.h);
            wsum += block.w;
            hsum += block.h;
            block.centerX = parseFloat(block.x + block.w / 2);
            block.centerY = parseFloat(block.y + block.h / 2);
            minCenterX = Math.min(minCenterX, block.centerX);
            maxCenterX = Math.max(maxCenterX, block.centerX);
            minCenterY = Math.min(minCenterY, block.centerY);
            maxCenterY = Math.max(maxCenterY, block.centerY);
        }
        let middleX = parseFloat(leftMost + (rightMost - leftMost) / 2);
        let middleY = parseFloat(topMost + (bottomMost - topMost) / 2);
        // console.log(`aling(${type})`);
        // console.log(`L=${leftMost}/R=${rightMost}/T=${topMost}/B=${bottomMost}/MX=${middleX}/MY=${middleY}`);
        // console.log(`C=${minCenterX}/${minCenterY}/${maxCenterX}/${maxCenterY}`);
        // console.log(`S=${wsum}/${hsum}`);

        if (type === 'start') {
            blocks.forEach(block => {
                let rx = parseFloat(leftMost - block.x);
                let ry = 0;
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            });
        } else if (type === 'center') {
            blocks.forEach(block => {
                let rx = parseFloat(middleX - (block.x + block.w / 2));
                let ry = 0;
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            });
        } else if (type === 'end') {
            blocks.forEach(block => {
                let rx = parseFloat(rightMost - (block.x + block.w));
                let ry = 0;
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            });
        } else if (type === 'top') {
            blocks.forEach(block => {
                let rx = 0;
                let ry = parseFloat(topMost - block.y);
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            });
        } else if (type === 'middle') {
            blocks.forEach(block => {
                let rx = 0;
                let ry = parseFloat(middleY - (block.y + block.h / 2));
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            });
        } else if (type === 'bottom') {
            blocks.forEach(block => {
                let rx = 0;
                let ry = parseFloat(bottomMost - (block.y + block.h));
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            });
        } else if (type === 'halign') {
            let space = rightMost - leftMost - wsum; // 빈공간의 총합.
            let espace = parseFloat(space / (blocks.length - 1));
            blocks.sort((a, b) => a.centerX - b.centerX); // 중심점을 기준으로 정렬.
            for (let idx = 1; idx < count - 1; idx++) {
                let before = blocks[idx - 1];
                let block = blocks[idx];
                let moveTo = before.x + before.w + espace;
                let rx = moveTo - block.x;
                let ry = 0;
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            }
            // 아래는 각 블록의 중심점을 기준으로 하여 동일한 간격으로 정렬하는 로직임.
            // let space = parseFloat((maxCenterX - minCenterX) / (count - 1));
            // blocks.sort((a, b) => a.centerX - b.centerX);
            // for (let idx = 1; idx < count - 1; idx++) {
            //     let block = blocks[idx];
            //     let moveTo = minCenterX + (space * idx);
            //     block.setPosition(moveTo - block.centerX, 0, true);
            // }
        } else if (type === 'valign') {
            let space = bottomMost - topMost - hsum; // 빈공간의 총합.
            let espace = parseFloat(space / (blocks.length - 1));
            blocks.sort((a, b) => a.centerY - b.centerY); // 중심점을 기준으로 정렬.
            for (let idx = 1; idx < count - 1; idx++) {
                let before = blocks[idx - 1];
                let block = blocks[idx];
                let moveTo = before.y + before.h + espace;
                let rx = 0;
                let ry = moveTo - block.y;
                block.setPosition(rx, ry, true);
                undoData.actions.push({ block, rx, ry });
            }
            // 아래는 각 블록의 중심점을 기준으로 하여 동일한 간격으로 정렬하는 로직임.
            // let space = parseFloat((maxCenterY - minCenterY) / (count - 1));
            // blocks.sort((a, b) => a.centerY - b.centerY);
            // for (let idx = 1; idx < count - 1; idx++) {
            //     let block = blocks[idx];
            //     let moveTo = minCenterY + (space * idx);
            //     block.setPosition(0, moveTo - block.centerY, true);
            // }
        }
        this.removeHelperLine();
        if (undoData.actions.push.length > 0) {
            this.actionManager.append(ActionManager.COMPONENTS_ALIGNED, undoData);
        }
    }

    fireEvent(eventName, ...args) {
        let listeners = this.eventMap.get(eventName);
        if (listeners) {
            listeners.forEach(f => f(...args));
        }
    }

    setCreateMode(nodeName) {
        // CreateMode 를 끄려면 null 설정
        this.creatingNodeName = nodeName;
    }

    selectAll() {
        this.components.forEach(c => c.select());
    }

    unselectAll() {
        this.clearSelection();
    }

    zoomReset() {
        this.zoom(1.0);
    }

    zoomIn(e) {
        this.zoom(0.9, true, e);
    }

    zoomOut(e) {
        this.zoom(1.1, true, e);
    }

    zoom(scale, isRelative = false, pointerEvent = null) {
        if (scale === 1.0) {
            this.svg.removeAttribute('viewBox');
            this.fireEvent(EVENT_ZOOMED, scale);
        } else {
            let vpw = parseFloat(getComputedStyle(this.svg).width);
            let vph = parseFloat(getComputedStyle(this.svg).height);
            let viewBox = getHtmlAttribute(this.svg, 'viewBox');
            let vbx = 0;
            let vby = 0;
            let vbw = 0;
            let vbh = 0;
            if (viewBox) {
                [vbx, vby, vbw, vbh] = viewBox.split(/[\s,]+/);
            } else {
                [vbx, vby, vbw, vbh] = [0, 0, vpw, vph];
            }
            if (isRelative) {
                let e = pointerEvent;
                if (e) {
                    let currentPoint = __getMousePosition(this.svg, e.clientX, e.clientY);
                    vbx = parseFloat(vbx) + (currentPoint.x - vbx) * (1 - scale);
                    vby = parseFloat(vby) + (currentPoint.y - vby) * (1 - scale);
                } else {
                    let middlePoint = __getMousePosition(this.svg, vpw / 2, vph / 2);
                    vbx = parseFloat(vbx) + (middlePoint.x - vbx) * (1 - scale);
                    vby = parseFloat(vby) + (middlePoint.y - vby) * (1 - scale);
                }
                vbw *= scale;
                vbh *= scale;
            } else {
                let middlePoint = __getMousePosition(this.svg, vpw / 2, vph / 2);
                if (!viewBox) {
                    vbw = vpw * scale;
                    vbh = vph * scale;
                } else {
                    vbw *= scale;
                    vbh *= scale;
                }
                vbx = parseFloat(vbx) + (middlePoint.x - vbx) * (1 - scale);
                vby = parseFloat(vby) + (middlePoint.y - vby) * (1 - scale);
            }
            setHtmlAttribute(this.svg, 'viewBox', `${vbx} ${vby} ${vbw} ${vbh}`);
            this.fireEvent(EVENT_ZOOMED, vbw / vpw);
        }
    }

    /**
     * TODO: 이미 다른 번호로 세팅 되어있는 블록을 세팅하려고할 때 기존껄 지우고 새로 세팅되도록
     */
    toggleBookMark(num) {
        if (this.isLocked()) {
            return;
        }
        const items = this.selectedItems;
        if (items.length === 1 && items[0].type === 'B') {
            const blockId = items[0].id;
            if (this.bookmarkMap.get(num) === blockId) {
                this.bookmarkMap.delete(num);
                if (this.options.debugMode) {
                    console.log(`bookmark ${num} has been removed.`);
                }
            } else {
                this.bookmarkMap.set(num, blockId);
                if (this.options.debugMode) {
                    console.log(`bookmark ${num} have been added.`);
                }
            }
        } else {
            if (this.options.debugMode) {
                console.log('You must select one block for bookmarking.');
            }
        }
    }

    // TODO: 배율 고려한 코드 추가 (zoom되어진 상태일 시)
    // TODO: focusNode(blockId) 함수 추후 모듈화
    jumpToBookMark(num) {
        const blockId = this.bookmarkMap.get(num);
        if (blockId) {
            this.focusNode(blockId);
        }
    }

    // TODO: 프린트 및 다운로드 기능 v1.1.9 버전에 검토
    downloadImage() {
        const svgToXML = new XMLSerializer().serializeToString(this.svg);

        const svgBlob = new Blob([svgToXML], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const $link = document.createElement('a');
        $link.download = 'svg-diagram.svg';
        $link.href = url;
        $link.click();
    }

    // TODO: 프린트 버튼을 누른 후 드래그 -> 드래그 한 영역만 인쇄할 수 있도록 하는게 목표
    printImage() {
        console.log(this.svg.outerHTML);
        const printWindow = window.open('', '', 'height=500, width=500');
        printWindow.document.write('<html><head><title>Print SVG</title>');
        printWindow.document.write('<style>svg { width: 3221; height: 1610; }</style>'); // 인쇄 시 사이즈 조정
        printWindow.document.write('</head><body>');
        printWindow.document.write(this.svg.outerHTML); // SVG 태그 내용 복사
        printWindow.document.write('</body></html>');
        printWindow.document.close(); // 문서 마무리
        printWindow.print(); // 인쇄 다이얼로그 호출
        // printWindow.close(); // 인쇄 후 창 닫기
    }

    /**
     * @param {string} blockId
     */
    focusNode(blockId) {
        if (this.isLocked()) {
            return;
        }
        const blockObj = this.components.get(blockId);
        if (blockObj) {
            // 기존 선택을 모두 해제하고 하나만 선택되도록 한다.
            this.unselectAll();
            blockObj.select();
            const style = getComputedStyle(this.svg);
            let svgw = parseFloat(style.width);
            let svgh = parseFloat(style.height);
            const vb = getHtmlAttribute(this.svg, 'viewBox');
            let vbx, vby, vbw, vbh;
            if (vb) {
                let fields = vb.split(/\s+/);
                vbx = parseFloat(fields[0]);
                vby = parseFloat(fields[1]);
                vbw = parseFloat(fields[2]);
                vbh = parseFloat(fields[3]);
            } else {
                vbx = 0;
                vby = 0;
                vbw = parseFloat(svgw);
                vbh = parseFloat(svgh);
            }
            // svg 의 정가운데 점을 보도록 viewBox 를 이동한다.
            let moveX = (svgw - vbw) / 2;
            let moveY = (svgh - vbh) / 2;
            // block 이 정가운데 점에서 이동된 거리만큼 추가로 viewBox 를 이동한다.
            moveX += blockObj.x + (blockObj.w / 2) - (svgw / 2);
            moveY += blockObj.y + (blockObj.h / 2) - (svgh / 2);
            let vbNew = [moveX, moveY, vbw, vbh]; // 기존의 vbw, vbh 를 유지한다.
            if (this.options.debugMode) {
                console.log('focusNode(): ' +
                    `xy=${blockObj.x}/${blockObj.y}, vp=${svgw}/${svgh}, ` +
                    `vb=${vb}, vbNew=${vbNew}`);
            }
            // NOTE: svg 를 담고 있는 container (div 등) 에 스크롤바가 있는 경우에는
            // 블럭을 정중앙에 보이도록 위치시킨다고 해도 해당 스크롤바로 인해
            // 정중앙이 아닌 것처럼 보일 수 있다. 이러한 이유로 스크롤바를 사용하지 않는
            // 것을 권장하며, 사용하는 경우에는 스크롤바는 사용자코드에서 제어해야 한다.
            // (예를 들어 스크롤바를 중앙에 오도록 조정하기)
            setHtmlAttribute(this.svg, 'viewBox', vbNew.join(' '));
        }
    }

    setBlockColor(blockObj) {
        let colorChangingBlocks = Object.assign({}, blockObj);
        colorChangingBlocks.blockArray.forEach((blockId) => {
            let component = this.components.get(blockId);
            component.setColor(colorChangingBlocks.blockColor, colorChangingBlocks.iconColor);
        });
    }

    /**
     * @param {string} svgSelector jquery selector for svg element
     * @param {string} xml xml from which new diagram built
     * @returns {object} diagram object
     */
    static deserialize(svgSelector, meta, xml, options) {
        let diagram = new Diagram(svgSelector, meta, options);
        let rootNode = NodeWrapper.parseFromXML(xml);
        let maxSeq = -1;

        for (let node of rootNode.children('block')) {
            let block = Block.deserialize(diagram, node);
            let seq = parseInt(block.id);
            if (seq !== 99999999 && seq > maxSeq) {
                maxSeq = seq;
            }
        }

        for (let node of rootNode.children('block')) {
            let nodeId = node.attr('id');
            let block = diagram.components.get(nodeId);
            if (block.eventElementArray && block.eventElementArray.length > 0) {
                let index = 0;
                for (let nodeSub of node.children('choice')) {
                    Link.deserialize(block.eventElementArray[index], nodeSub, CUSTOM_BLOCK);
                    index++;
                }
            } else {
                for (let nodeSub of node.children('choice')) {
                    Link.deserialize(block, nodeSub);
                }
            }
        }

        for (let node of rootNode.children('memo')) {
            Memo.deserialize(diagram, node);
        }

        diagram.actionManager.reset();
        diagram.ready = true;
        return diagram;
    }

    /**
     * @param {string} svgSelector jquery selector for svg element
     * @param {string} xml xml from which new diagram built
     * @returns {object} diagram object
     */
    static deserializeToJSON(svgSelector, meta, json, options) {
        let diagram = new Diagram(svgSelector, meta, options);
        let maxSeq = -1;
        let rootJSON = JSON.parse(json);
        for (let node of rootJSON.scenario.block) {
            let block = Block.deserializeToJSON(diagram, node);
            let seq = parseInt(block.id);
            if (seq !== 99999999 && seq > maxSeq) {
                maxSeq = seq;
            }
        }

        for (let node of rootJSON.scenario.block) {
            let nodeId = node._id;
            let block = diagram.components.get(nodeId);
            if (block.eventElementArray && block.eventElementArray.length > 0) {
                let index = 0;
                if (Array.isArray(node.choice)) {
                    for (let nodeSub of node.choice) {
                        Link.deserializeToJSON(block.eventElementArray[index], nodeSub, CUSTOM_BLOCK);
                        index++;
                    }
                } else {
                    if (node.choice) {
                        Link.deserializeToJSON(block, node, CUSTOM_BLOCK);
                    }
                }
            } else {
                if (Array.isArray(node.choice)) {
                    node.choice.forEach((nodeSub) => {
                        Link.deserializeToJSON(block, nodeSub);
                    });
                } else {
                    if (node.choice) {
                        Link.deserializeToJSON(block, node);
                    }
                }
            }
        }

        for (let node of rootJSON.scenario.memo) {
            Memo.deserializeToJSON(diagram, node);
        }

        diagram.actionManager.reset();
        diagram.ready = true;
        return diagram;
    }

    /**
     * @param {Diagram} diagram
     */
    static serialize(diagram) {
        let rootNode = new NodeWrapper('scenario');

        let blocks = [];
        let memos = [];
        for (let c of diagram.components.values()) {
            if (c.type === 'B') {
                blocks.push(c);
            } else if (c.type === 'M') {
                memos.push(c);
            }
        }

        for (let block of blocks) {
            let blockNode = rootNode.appendChild('block');
            Block.serialize(block, blockNode);
        }

        for (let memo of memos) {
            let memoNode = rootNode.appendChild('memo');
            Memo.serialize(memo, memoNode);
        }
        return rootNode.toString();
    }

    /**
     * @param {Diagram} diagram
     */
    static serializeToJSON(diagram) {
        let scenarioJSON = {
            scenario: {
                block: [],
                memo: [],
            }
        };
        let blocks = [];
        let memos = [];
        for (let c of diagram.components.values()) {
            if (c.type === 'B') {
                blocks.push(c);
            } else if (c.type === 'M') {
                memos.push(c);
            }
        }

        for (let block of blocks) {
            let blockJSON = Block.serializeToJSON(block);
            scenarioJSON.scenario.block.push(blockJSON);
        }

        for (let memo of memos) {
            let memoJSON = Memo.serializeToJSON(memo);
            scenarioJSON.scenario.memo.push(memoJSON);
        }

        return JSON.stringify(scenarioJSON, null, 4);
    }

    static createEmpty(svgSelector, meta, options) {
        let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Diagram></Diagram>';
        return Diagram.deserialize(svgSelector, meta, xml, options);
    }

    _setBackgroundPattern() {
        const id = this.id;
        const pattern1Size = 10;
        const pattern2Size = pattern1Size * 10;
        const pattern1Path = __makeSvgElement('path', { d: 'M ' + pattern1Size + ' 0 L 0 0 0 ' + pattern1Size, fill: 'none', stroke: 'rgb(220, 220, 220)', 'stroke-width': 0.5 });
        const pattern1 = __makeSvgElement('pattern', { id: id + '-smallGrid', width: pattern1Size, height: pattern1Size, patternUnits: 'userSpaceOnUse' });
        const pattern2Rect = __makeSvgElement('rect', { width: pattern2Size, height: pattern2Size, fill: 'url(#' + id + '-smallGrid)' });
        const pattern2Path = __makeSvgElement('path', { d: 'M ' + pattern2Size + ' 0 L 0 0 0 ' + pattern2Size, fill: 'none', stroke: 'rgb(220, 220, 220)', 'stroke-width': 1 });
        const pattern2 = __makeSvgElement('pattern', { id: id + '-grid', width: pattern2Size, height: pattern2Size, patternUnits: 'userSpaceOnUse' });
        const defs = __makeSvgElement('defs');
        const finalRect = __makeSvgElement('rect', { width: '1000000%', height: '1000000%', fill: 'url(#' + id + '-grid)', style: 'pointer-events: none', transform: 'translate(-500000, -500000)' });
        pattern1.appendChild(pattern1Path);
        pattern2.appendChild(pattern2Rect);
        pattern2.appendChild(pattern2Path);
        defs.appendChild(pattern1);
        defs.appendChild(pattern2);
        this.svg.appendChild(defs);
        this.svg.appendChild(finalRect);
    }

    _contextmenu(e) {
        const clickedObjectId = e.target.dataset.id;
        const clickedObject = this.components.get(clickedObjectId);
        const blockOutboundLinks = [];

        let element = document.elementFromPoint(e.pageX, e.pageY);
        if (this.options.onContextMenu) {
            // TODO: 의미있는 element 인 경우에만 전달하도록 개선하기.
            // SVG 영역이 아닌 컴퍼넌트를 클릭했을 때 && Block클래스인지
            if (this.options.blockType === CUSTOM_DIAGRAM_TYPE && e.target.id !== this.svg.id && clickedObject instanceof Block) {
                clickedObject.links.forEach((link) => {
                    if (link.blockOrigin.id === clickedObjectId) {
                        blockOutboundLinks.push(link);
                    }
                });
                this.options.onBlockContextMenu(e, element, clickedObject, blockOutboundLinks);
            } else {
                // block을 우클릭했을 때
                if (clickedObject && clickedObject.type === 'B') {
                    this.options.onContextMenu(e, clickedObject);
                // SVG 영역을 우클릭했을 때
                } else if (clickedObject === undefined) {
                    this.options.onContextMenu(e, undefined);
                }
            }
        }
    }

    _mousedown(e) {
        const offset = __getMousePosition(e.target, e.clientX, e.clientY);

        if (this.grabDown) {
            this.svgDragInfo.x = e.clientX;
            this.svgDragInfo.y = e.clientY;
        } else if (e.target.classList.contains('draggable')) {
            if (this.isLocked()) {
                return;
            }
            if (e.buttons === MOUSE_BUTTON_PRIMARY) {
                let element = e.target;
                let id = element.getAttributeNS(null, 'data-id');
                let c = this.components.get(id);
                let selected = this.isSelected(c);
                if (selected) {
                    if (e.shiftKey) {
                        c.unselect();
                        return;
                    }
                } else if (!selected) {
                    if (!e.shiftKey) {
                        // shiftKey 를 누르지 않은 경우에는 (추가 선택 모드가 아니므로)
                        // 기존의 선택을 모두 제거한다.
                        this.unselectAll();
                    }
                    // 이동을 위해 마우스를 누른 경우에도 선택하는 것으로 본다.
                    // 즉 선택과 동시에 드래그가 가능해진다.
                    c.select();
                }

                this.dragStart = {
                    item: c,
                    offsetX: offset.x - c.x,
                    offsetY: offset.y - c.y,
                    x: offset.x,
                    y: offset.y,
                    lastX: offset.x,
                    lastY: offset.y,
                };
                if (this.contextMenu) {
                    this.dialog.remove();
                }
            }
        } else if (e.target === this.svg) {
            if (this.lockLevel >= LOCK_MAX) {
                return;
            }
            // TODO: 영향도 파악해야함 주석처리해도 되는 부분인지
            if (!e.shiftKey) {
                // 블록 링크효과 제거
                if (this.blinkOriginBlock || this.blinkDestBlock) {
                    this.blinkOriginBlock.shapeElement.classList.remove('connect-block');
                    this.blinkDestBlock.shapeElement.classList.remove('connect-block');
                }
                this.clearSelection();
            }
            if (e.buttons === MOUSE_BUTTON_PRIMARY) {
                let lnf = this.options.lookAndFeel.selectionBox;
                let box = __makeSvgElement('rect', {
                    x: offset.x,
                    y: offset.y,
                    'data-init-x': offset.x,
                    'data-init-y': offset.y,
                    style: `fill: ${lnf.fill};
                        fill-opacity: ${lnf.opacity};
                        stroke: ${lnf.stroke};
                        stroke-width: 1;
                        stroke-dasharray: 3 3;
                        pointer-events: none`,
                });
                this.svg.appendChild(box);
                this.selectionBox = box;
            }
            if (this.contextMenu) {
                this.dialog.remove();
            }
            this.offBlink();
        } else if (e.target.dataset.type === 'shapePoint' && e.buttons === MOUSE_BUTTON_PRIMARY) {
            let id = e.target.dataset.id;
            let link = this.components.get(id);
            let cx = parseFloat(link.shapePointElement.getAttribute('cx'));
            let cy = parseFloat(link.shapePointElement.getAttribute('cy'));
            link.shapePointElement.dragStartX = offset.x - cx;
            link.shapePointElement.dragStartY = offset.y - cy;
            this.shapeChangeLink = link;
            this.shapeChangeLink.__beforeMove = {
                moveX: link.moveX,
                moveY: link.moveY
            };
        } else if (e.target.dataset.type === 'addEvent' && e.buttons === MOUSE_BUTTON_PRIMARY) {
            this.contextMenu = true;
            this.loadContextMenu(e);
        } else if (e.target.dataset.type === CUSTOM_EVENT_BLOCK && e.buttons === MOUSE_BUTTON_PRIMARY) {
            if (Number(e.target.dataset.linkId)) {
                const linkId = e.target.dataset.linkId;
                if (this.blink.linkArray.has(linkId)) {
                    this.offBlink(linkId);
                    return;
                }
                const link = this.components.get(linkId);
                const block = this.components.get(linkId);
                this.blink.linkArray.add(linkId);
                this.blink.on = true;
                block.anchorFrom.block.shapeElement.classList.add('blink');
                link.shapeElement.classList.add('blinkLine');
            }
        }
    }

    offBlink(deleteLinkId) {
        if (!this.blink.on) return;

        const removeBlinkEffect = (linkId) => {
            const link = this.components.get(linkId);
            const block = link && link.anchorFrom && link.anchorFrom.block;

            if (block) block.shapeElement.classList.remove('blink');
            if (link) link.shapeElement.classList.remove('blinkLine');

            this.blink.linkArray.delete(linkId);
        };

        // 특정 링크만 제거
        if (deleteLinkId) {
            removeBlinkEffect(deleteLinkId);
        } else {
            [...this.blink.linkArray].forEach(removeBlinkEffect);
        }
    }

    _mousemove(e) {
        const offset = __getMousePosition(this.svg, e.clientX, e.clientY);
        this.mousePosition = offset;

        if (this.dragStart) {
            e.preventDefault();

            let dragStart = this.dragStart;
            if (e.buttons === MOUSE_BUTTON_PRIMARY) {
                let byX = offset.x - dragStart.lastX;
                let byY = offset.y - dragStart.lastY;
                dragStart.lastX = offset.x;
                dragStart.lastY = offset.y;

                this.selectedItems.forEach(m => {
                    if ((m.type === 'B' || m.type === 'M')) {
                        m.setPosition(byX, byY, true);
                    }
                });
            } else {
                // SVG 영역을 벗어났다가 다시 들어오는 경우, SVG 외부에서
                // 발생하는 mouseup 이벤트를 받을 수 없어 발생하는 문제 고려해야 함.
                // 1) 원래의 위치로 돌아가기.
                // 2) 이동을 확정하고 ActionManager 에 넣기. (이것이 더 편해 보임)
                let relX = dragStart.item.x - (dragStart.x - dragStart.offsetX);
                let relY = dragStart.item.y - (dragStart.y - dragStart.offsetY);
                let targets = [...this.selectedItems];
                let undoData = { targets, relX, relY };
                this.actionManager.append(ActionManager.COMPONENTS_MOVED, undoData);
                this.dragStart = null;
            }
        } else if (this.selectionBox) {
            if (e.buttons !== MOUSE_BUTTON_PRIMARY) {
                // SelectionBox 를 사용중에 SVG 영역을 벗어났다가
                // 다시 들어오는 경우, SVG 영역 밖에서 마우스를 뗀 경우
                // mouseup 이벤트는 발생하지 않기 때문에 SelectionBox 해제를
                // 하지 못하는 경우가 생기기 때문에 여기서 추가 체크한다.
                // (주의)
                // ==> e.button 뿐만 아니라 e.buttons 도 체크하도록 한다.
                // ==> e.button 은 버튼이 해제될 때는 값이 초기화되지 않는다.
                let box = this.selectionBox;
                this.svg.removeChild(box);
                this.selectionBox = null;
                return;
            }
            let box = this.selectionBox;
            let x = parseFloat(box.getAttributeNS(null, 'data-init-x'));
            let y = parseFloat(box.getAttributeNS(null, 'data-init-y'));
            let w, h;

            if (offset.x < x) {
                w = x - offset.x;
                x = offset.x;
            } else {
                w = offset.x - x;
            }

            if (offset.y < y) {
                h = y - offset.y;
                y = offset.y;
            } else {
                h = offset.y - y;
            }

            __setSvgAttrs(box, {
                x,
                y,
                width: w,
                height: h
            });

            let xmargin = e.clientX - e.offsetX;
            let ymargin = e.clientY - e.offsetY;
            let _r = box.getBoundingClientRect();
            let _rect = this.svg.createSVGRect();
            _rect.x = _r.x - xmargin;
            _rect.y = _r.y - ymargin;
            _rect.width = _r.width;
            _rect.height = _r.height;
            // getIntersectionList() 의 첫번째 인자는 SVG 좌표가 아니라 페이지의
            // 좌표를 입력해야 한다. 그래서 getBoundingClientRect() 를 사용했음.
            // 그런데 특이하게도 원점은 SVG 의 0,0 원점을 사용해야 정확히 작동함.
            // 그래서 xmargin, ymargin 을 계산해서 빼주었음.
            let nodeList = this.svg.getIntersectionList(_rect, null);
            let selected = this.selectedItems;
            let selecting = [];

            for (let n = 0; n < nodeList.length; n++) {
                let node = nodeList.item(n);
                let id = node.getAttributeNS(null, 'data-id');
                if (id) {
                    selecting.push(this.components.get(id));
                }
            }
            // 각 Component 에 대해 select() 가 수행되기 전에 Unselect 할 목록을 얻어옴.
            let unselecting = selected.filter(t => !selecting.includes(t));
            if (!e.shiftKey) {
                for (let c of unselecting) {
                    c.unselect();
                }
            }
            for (let c of selecting) {
                c.select();
            }
        } else if (this.creatingLinkOrigin) {
            let line = this.creatingLinkLine;
            let lx = line.getAttributeNS(null, 'x1');
            let ly = line.getAttributeNS(null, 'y1');
            line.setAttributeNS(null, 'x2', offset.x);
            line.setAttributeNS(null, 'y2', offset.y);
            let distance = Math.sqrt(Math.pow((offset.x - lx), 2) + Math.pow((offset.y - ly), 2));
            if (distance > 15) {
                line.setAttributeNS(null, 'marker-end', `url(#${this.markerId})`);
            } else {
                line.setAttributeNS(null, 'marker-end', '');
            }
            // 라인을 잡고 움직일 때 anchor주변에 갔을 때 마그네틱 효과를 주는 로직
            if (this.activeAnchor) {
                this.activeAnchor.setHover();
                line.setAttributeNS(null, 'x2', this.activeAnchor.x);
                line.setAttributeNS(null, 'y2', this.activeAnchor.y);
            }
        } else if (this.movingLine) {
            this.movingLine.originLink.hide();
            let line = this.movingLine.tempLine;
            line.setAttributeNS(null, 'x2', offset.x);
            line.setAttributeNS(null, 'y2', offset.y);
            line.setAttributeNS(null, 'marker-end', `url(#${this.markerId})`);
            // 라인을 잡고 움직일 때 anchor주변에 갔을 때 마그네틱 효과를 주는 로직
            if (this.activeAnchor) {
                this.activeAnchor.setHover();
                line.setAttributeNS(null, 'x2', this.activeAnchor.x);
                line.setAttributeNS(null, 'y2', this.activeAnchor.y);
            }
        } else if (this.grabDown) {
            if (!this._checkKeyAction(KeyActionNames.GrabAndZoom, e)) {
                this.svg.style.cursor = '';
                this.grabDown = false;
                return;
            }
            if (e.buttons === MOUSE_BUTTON_PRIMARY) {
                let deltaX = e.clientX - this.svgDragInfo.x;
                let deltaY = e.clientY - this.svgDragInfo.y;
                let viewBox = getHtmlAttribute(this.svg, 'viewBox');
                let style = getComputedStyle(this.svg);
                let scale = 1.0;
                if (viewBox) {
                    viewBox = viewBox.split(/[\s,]+/);
                    scale = parseFloat(viewBox[2]) / parseFloat(style.width);
                } else {
                    viewBox = [0, 0, parseFloat(style.width), parseFloat(style.height)];
                }
                viewBox[0] -= parseFloat(deltaX * scale);
                viewBox[1] -= parseFloat(deltaY * scale);

                setHtmlAttribute(this.svg, 'viewBox', viewBox.join(' '));
                this.svgDragInfo.x = e.clientX;
                this.svgDragInfo.y = e.clientY;
            }
        } else if (this.shapeChangeLink) {
            if (e.buttons === MOUSE_BUTTON_PRIMARY) {
                this.shapeChangeLink.moveShapePoint(offset.x, offset.y);
            } else {
                this.shapeChangeLink = null;
            }
        }
    }

    _mouseup(e) {
        const offset = __getMousePosition(e.target, e.clientX, e.clientY);

        if (this.dragStart) {
            this.removeHelperLine();
            let relX = offset.x - this.dragStart.x;
            let relY = offset.y - this.dragStart.y;

            if (relX !== 0 || relY !== 0) {
                let targets = [...this.selectedItems];
                let undoData = { targets, relX, relY };
                this.actionManager.append(ActionManager.COMPONENTS_MOVED, undoData);
                this.fireEvent(EVENT_DIAGRAM_MODIFIED, ...this.selectedItems, ModifyEventTypes.NodeMoved);
            }
            this.dragStart = null;
        }
        if (this.selectionBox) {
            let box = this.selectionBox;
            this.svg.removeChild(box);
            this.selectionBox = null;
        }
        let anchor = this.creatingLinkOrigin;
        let line = this.creatingLinkLine;
        if (line) {
            anchor.setVisible(false);
            this.creatingLinkOrigin = null;
            this.creatingLinkLine = null;
            this.svg.removeChild(line);
        }
        if (this.movingLine) {
            let originLink = this.movingLine.originLink;
            originLink.show();

            this.svg.removeChild(this.movingLine.tempLine);
            this.movingLine = null;
        }
        if (this.shapeChangeLink) {
            let link = this.shapeChangeLink;
            // this.shapeChangeLink.adjustPoints();
            this.shapeChangeLink = null;
            this.actionManager.append(ActionManager.LINK_SHAPE_CHANGED, {
                link,
                beforeMove: link.__beforeMove,
                newMove: {
                    moveX: link.moveX,
                    moveY: link.movey
                }
            });
            this.fireEvent(EVENT_DIAGRAM_MODIFIED, link, ModifyEventTypes.LinkArranged);
        }
    }

    _mouseclick(e) {
        let nodeName = this.creatingNodeName;
        this.creatingNodeName = null;
        if (nodeName) {
            this.createNode(nodeName, e.clientX, e.clientY);
        }
    }

    _mousescroll(e) {
        if (this.grabDown) {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.zoomOut(e);
            } else {
                this.zoomIn(e);
            }
        }
    }

    _registerKeyAction(action, keyCombo) {
        let kset = new Set(keyCombo);
        for (let k in this.keyActions) {
            let v = this.keyActions[k];
            if (k !== action && assertSetEquals(v, kset)) {
                let _kset = [...kset].join(', ');
                let _v = [...v].join(', ');
                let err = `Duplicate key combination: ${action}=[${_kset}], ${k}=[${_v}]`;
                console.error(err);
            }
        }
        this.keyActions[action] = kset;
    }

    _checkKeyAction(action, keyEvent) {
        let keyCombo = this.keyActions[action];
        return assertSetEquals(this.keyTracking, keyCombo);
    }

    _getKeyAction(keyEvent) {
        let ctrl = keyEvent.ctrlKey;
        let alt = keyEvent.altKey;
        let shift = keyEvent.shiftKey;
        let meta = keyEvent.metaKey;

        // key: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
        let key = keyEvent.key; // (e.g., Control, Shift, a, A, 1, F1)
        // keyCode: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
        // let keyCode = keyEvent.keyCode; // Deprecated
        // charCode: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/charCode
        // let charCode = keyEvent.charCode; // Deprecated
        // code: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
        let code = keyEvent.code; // Physical key (문자가 아닌), (e.g., ControlLeft, ControlRight)
        let log = `Ctrl:${ctrl}, Alt:${alt}, Shift:${shift}, Meta:${meta}, Key:${key}, Code:${code}`;
        if (this.options.debugMode) {
            console.log(log, keyEvent);
        }
        for (let action in this.keyActions) {
            let keyCombo = this.keyActions[action];
            if (assertSetEquals(this.keyTracking, keyCombo)) {
                if (this.options.debugMode) {
                    console.log('same:', this.keyTracking, keyCombo);
                }
                return action;
            }
        }
        return null;
    }

    _keydown(e) {
        this.keyTracking.add(e.key);
        if (this.options.debugMode) {
            console.log('keyTracking: ', this.keyTracking);
        }
        let keyAction = this._getKeyAction(e);
        if (this.options.debugMode) {
            console.log('keyAction: ', keyAction);
        }
        if (keyAction === KeyActionNames.Escape) {
            this.setCreateMode(null);
            this.unselectAll();
        } else if (keyAction === KeyActionNames.Delete) {
            e.preventDefault();
            this.delete();
        } else if (keyAction === KeyActionNames.SelectAll) {
            e.preventDefault();
            this.selectAll();
        } else if (keyAction === KeyActionNames.Copy) {
            e.preventDefault();
            this.copy();
        } else if (keyAction === KeyActionNames.Paste) {
            e.preventDefault();
            this.paste();
        } else if (keyAction === KeyActionNames.Cut) {
            e.preventDefault();
            this.cut();
        } else if (keyAction === KeyActionNames.Undo) {
            e.preventDefault();
            this.undo();
        } else if (keyAction === KeyActionNames.Redo) {
            e.preventDefault();
            this.redo();
        } else if (keyAction === KeyActionNames.SetBookmark) {
            e.preventDefault();
            if (e.key.match(/[0-9]/)) {
                this.toggleBookMark(e.key);
            }
        } else if (keyAction === KeyActionNames.JumpBookmark) {
            e.preventDefault();
            if (e.key.match(/[0-9]/)) {
                this.unselectAll();
                this.jumpToBookMark(e.key);
            }
        } else if (keyAction === KeyActionNames.GrabAndZoom) {
            e.preventDefault();
            this.svg.style.cursor = 'grab';
            this.grabDown = true;
        } else if (keyAction === KeyActionNames.IncreaseHeight) {
            e.preventDefault();
            for (let item of this.selectedItems) {
                if (item.type === 'B' || item.type === 'M') {
                    item.setRelativeSize(0, +BLOCK_CHANGE_SIZE);
                }
            }
        } else if (keyAction === KeyActionNames.DecreaseHeight) {
            e.preventDefault();
            for (let item of this.selectedItems) {
                if (item.type === 'B' || item.type === 'M') {
                    item.setRelativeSize(0, -BLOCK_CHANGE_SIZE);
                }
            }
        } else if (keyAction === KeyActionNames.IncreaseWidth) {
            e.preventDefault();
            for (let item of this.selectedItems) {
                if (item.type === 'B' || item.type === 'M') {
                    item.setRelativeSize(+BLOCK_CHANGE_SIZE, 0);
                }
            }
        } else if (keyAction === KeyActionNames.DecreaseWidth) {
            e.preventDefault();
            for (let item of this.selectedItems) {
                if (item.type === 'B' || item.type === 'M') {
                    item.setRelativeSize(-BLOCK_CHANGE_SIZE, 0);
                }
            }
        }
    }

    _keyup(e) {
        this.keyTracking.delete(e.key);
        if (this.options.debugMode) {
            console.log('keyTracking: ', this.keyTracking);
        }
        if (this.grabDown) {
            this.svg.style.cursor = '';
            this.grabDown = false;
        }
    }

    _blur(e) {
        // 영역을 벗어나면 KeyboardEvent 를 받을 수 없기 때문에
        // (특히 keyup 이벤트) 트랙킹이 정상적으로 되지 않으므로
        // 아예 모두 해제해 버린다.
        // 다른 어플리케이션들도 이렇게 하는 것으로 보임.
        this.keyTracking.clear();
        if (this.options.debugMode) {
            console.log('keyTracking: ', this.keyTracking);
        }
    }

    loadContextMenu(e) {
        let element = e.target;
        let id = element.getAttributeNS(null, 'data-id');
        let component = this.components.get(id);

        const ulTag = document.createElement('ul');
        ulTag.setAttribute('class', 'fm-menu');

        if (component.initArray.length) {
            component.initArray.forEach((value, index) => {
                // li 요소 생성
                let li = document.createElement('li');
                li.setAttribute('class', 'action-item');
                li.setAttribute('data-command', value);
                li.setAttribute('data-index', index);
                // i 요소 생성
                let i = document.createElement('i');
                i.setAttribute('class', 'bi bi-check-circle');

                // span 요소 생성
                let span = document.createElement('span');
                span.textContent = value;

                li.appendChild(i);
                li.appendChild(span);
                ulTag.appendChild(li);
            });
            this.dialog = document.createElement('div');
            this.dialog.id = `add-menu-${this.id}`;
            this.dialog.className = 'fm-wrapper';
            this.dialog.style.cssText = `
                position: absolute;
                left: ${e.pageX}px;
                top: ${e.pageY}px;
                background: #ffffff;
                border: 1px solid #ccc;
                padding: 10px;
                zIndex: 1000;
                visibility: visible
            `;
            this.dialog.appendChild(ulTag);
            document.body.appendChild(this.dialog);
            const actionItems = document.querySelectorAll('.action-item');
            actionItems.forEach(actionItem => {
                actionItem.addEventListener('click', () => component.contextMenuClick(actionItem));
            });
        }
    }

    drawHelperLine(x, y, width, height, componentId) {
        this.removeHelperLine();

        // 공통 헬퍼 라인 생성 함수
        const createHelperLine = (d) => __makeSvgElement('path', {
            stroke: 'red',
            'stroke-width': HELPLINE_STROKE_WIDTH,
            fill: 'none',
            opacity: 0.5,
            'stroke-dasharray': '8 8',
            d
        });

        // 헬퍼 라인 생성
        this.helperLines = {
            leftX: createHelperLine(`M ${x} -100000 L ${x} 1000000`),
            rightX: createHelperLine(`M ${x + width} -100000 L ${x + width} 1000000`),
            topY: createHelperLine(`M -100000 ${y} L 100000 ${y}`),
            bottomY: createHelperLine(`M -100000 ${y + height} L 100000 ${y + height}`)
        };

        const blockComponents = Array.from(this.components.values()).filter((component) => component.type === 'B' && component.id !== componentId);
        blockComponents.forEach((block) => {
            if ((parseInt(x) + (HELPLINE_STROKE_WIDTH / 2) >= block.x && parseInt(x) - (HELPLINE_STROKE_WIDTH / 2) <= block.x) || (parseInt(x) + (HELPLINE_STROKE_WIDTH / 2) > block.x + block.w && parseInt(x) - (HELPLINE_STROKE_WIDTH / 2) < block.x + block.w)) {
                this.svg.appendChild(this.helperLines.leftX);
            }
            if ((parseInt(x) + width + (HELPLINE_STROKE_WIDTH / 2) >= block.x && parseInt(x) + width - (HELPLINE_STROKE_WIDTH / 2) <= block.x) || (parseInt(x) + width + (HELPLINE_STROKE_WIDTH / 2) >= parseInt(block.x) + block.w && parseInt(x) + width - (HELPLINE_STROKE_WIDTH / 2) <= parseInt(block.x) + block.w)) {
                this.svg.appendChild(this.helperLines.rightX);
            }
            if ((parseInt(y) + (HELPLINE_STROKE_WIDTH / 2) >= block.y && parseInt(y) - (HELPLINE_STROKE_WIDTH / 2) <= block.y) || (parseInt(y) + (HELPLINE_STROKE_WIDTH / 2) >= block.y + block.h && parseInt(y) - (HELPLINE_STROKE_WIDTH / 2) <= block.y + block.h)) {
                this.svg.appendChild(this.helperLines.topY);
            }
            if ((parseInt(y) + height + (HELPLINE_STROKE_WIDTH / 2) >= block.y && parseInt(y) + height - (HELPLINE_STROKE_WIDTH / 2) <= block.y) || (parseInt(y) + height + (HELPLINE_STROKE_WIDTH / 2) >= block.y + block.h && parseInt(y) + height - (HELPLINE_STROKE_WIDTH / 2) <= block.y + block.h)) {
                this.svg.appendChild(this.helperLines.bottomY);
            }
        });
    }

    removeHelperLine() {
        if (this.helperLines) {
            Object.values(this.helperLines).forEach((helperLine) => {
                if (helperLine && this.svg.contains(helperLine)) {
                    this.svg.removeChild(helperLine);
                }
            });
            this.helperLine = null;
        }
    }
}

Diagram.defaultOptions = {
    onContextMenu: null,
    onBlockContextMenu: null,
    onNodeClicked: null,
    onNodeCreated: null,
    onNodeSelected: null,
    onNodeUnSelected: null,
    onNodeChanged: null,
    onZoomed: null,
    onDiagramModified: null,
    onLinkCreating: null,
    onNodeModifyingCaption: null,
    onNodeModifyingComment: null,
    useBackgroundPattern: false,
    blockType: NORMAL_DIAGRAM_TYPE,
    lineType: NORMAL_DIAGRAM_TYPE, // CUSTOM_DIAGRAM_TYPE : Custom블럭, NORMAL_DIAGRAM_TYPE : 일반블럭
    moveUnit: 0,
    minimapQuerySelector: null,
    keyActions: {},
    lookAndFeel: {
        selectionBox: {
            fill: 'purple',
            stroke: 'black',
            opacity: 0.05,
        },
        memo: {
            borderColor: '#E6C700',
            borderColorSelected: 'red',
            backgroundColor: '#FFDF6D',
            fontSize: '14px',
        }
    },
    colorPallete: {
        red: '#f44336',
        pink: '#e91e63',
        purple: '#9c27b0',
        deeppurple: '#673ab7',
        indigo: '#3f51b5',
        blue: '#2196f3',
        lightblue: '#03a9f4',
        cyan: ' #00bcd4',
        teal: ' #009688',
        green: '#4caf50',
        lightGreen: '#8bc34a',
        lime: '#cddc39',
        yellow: '#ffeb3b',
        amber: '#ffc107',
        orange: '#ff9800',
        deepOrange: '#ff5722',
        brown: '#795548',
        grey: '#9e9e9e',
        blueGrey: '#607d8b'
    },
    debugMode: false,
};

class ActionManager {
    constructor(diagram) {
        this.diagram = diagram;
        this.actions = [];
        this.action_max = 32;
        this.redoList = [];
        this.save = true;
    }

    reset() {
        // clear const array
        // this.actions.splice(0, actions.length);
        this.actions = [];
    }

    append(op, data) {
        if (!this.save) {
            return;
        }
        if (this.actions.length >= this.action_max) {
            this.actions.splice(0, 1);
        }
        let item = { op, data };

        // 아래에서 Block, Link, Memo 를 특별히 명시하지 않는 이상,
        // Component 는 것은 화면에 보이는 모든 Component 포함함.
        if (op === ActionManager.COMPONENTS_ADDED) {
            // 1) Diagram#createNode() 호출을 통해 하나의 Block, Memo 를 생성하는 경우.
            // 2) 마우스 클릭을 통해 하나의 Component 를 생성하는 경우. (Block, Link, Memo) => 1 번과 동일하므로 생략.
            // 3) Component 들을 붙여넣기 (Ctrl+V) 키를 통해서 붙여 넣는 경우.
            // 4) Component 들을 Diagram#paste() 호출을 통해 붙여 넣는 경우. => 3 번과 동일하므로 생략.
        } else if (op === ActionManager.COMPONENTS_REMOVED) {
            // 1) 삭제 (Delete) 키를 통해 선택 Component 들을 삭제하는 경우.
            // 2) Diagram#delete() 호출을 통해 선택 Component 들을 삭제하는 경우. => 1 번과 동일하므로 생략.
            // 3) Diagram#cut() 호출을 통해 선택 Component 들을 삭제하는 경우. => 2 번과 동일하므로 생략.
            // 4) 잘라내기 (Ctrl+X) 키를 통해서 선택 Component 들을 삭제하는 경우. => 3 번과 동일하므로 생략.
        } else if (op === ActionManager.COMPONENTS_MOVED) {
            // 1) 마우스 Drag-and-Drop 을 사용해서 선택 Component 들을 이동하는 경우.
        } else if (op === ActionManager.COMPONENTS_ALIGNED) {
            // 1) 마우스 align API 호출을 통해 블럭들을 정렬하는 경우.
        } else if (op === ActionManager.NODE_CAPTION_MODIFIED) {
            // 1) onNodeModifyingCaption 이벤트 처리에서 블럭의 Caption 을 변경하는 경우.
        } else if (op === ActionManager.NODE_COMMENT_MODIFIED) {
            // 1) onNodeModifyingComment 이벤트 처리에서 블럭의 Comment 를 변경하는 경우.
        } else if (op === ActionManager.MEMO_TEXT_MODIFIED) {
            // 1) Dblclick 하여 Memo 를 Editable 상태로 만든 후 텍스트를 변경하는 경우.
        } else if (op === ActionManager.COMPONENTS_RESIZED) {
            // 1) 블럭의 크기를 변경하는 경우.
        } else if (op === ActionManager.LINK_CONNECT_CHANGED) {
            // 1) 링크의 연결을 재설정하는 경우.
        } else if (op === ActionManager.LINK_SHAPE_CHANGED) {
            // 1) 링크의 모양이 변경되는 경우
        } else if (op === ActionManager.CUSTOM_EVENT_ADDED) {
            // 1) 커스텀 이벤트가 추가되는 경우
        } else if (op === ActionManager.CUSTOM_EVENT_REMOVED) {
            // 1) 커스텀 이벤트가 삭제되는 경우
        } else if (op === ActionManager.GROUP_ACTION) {
            // 1) 여러 블록을 그룹으로 묶기/풀기/접기-펼치기 하는 경우.
            // 그룹 관련 실제 로직은 이 라이브러리 바깥(blockGrouping.js)에 전부 있고,
            // 여기서는 그 로직이 만들어 넘긴 undo/redo 클로저를 그대로 호출만 한다 —
            // append()가 화이트리스트 방식이라 여기 분기가 없으면 이 액션 자체가
            // 조용히 버려진다 (아래 else return).
        } else {
            return;
        }
        if (this.diagram.options.debugMode) {
            console.log('ActionManager.append():', item);
        }
        this.actions.push(item);
        // 새로운 action 이 추가되면 redo 목록은 모두 제거한다.
        // undo-redo 구현을 최대한 단순하게 하기 위함이며,
        // 이러한 로직상으로는 undo 하면서 스택에 쌓인 redo 목록은
        // 바로 사용하지 않으면 날라갈 수 있게 된다.
        // undo-redo 로직은 어플리케이션마다 다르기 때문에
        // 다른 특정 어플리케이션과 비교할 필요는 없어 보임.
        this.redoList = [];
    }

    createElements(data) {
        let redoItems = [];
        let diagram = this.diagram;
        data.filter(c => c.type !== 'L').forEach(c => {
            if (c.type === 'B') {
                let block = c;
                let newBlock = Block.createInstance(
                    block.diagram,
                    block.id,
                    block.shape,
                    block.icon,
                    block.metaName,
                    block.caption,
                    block.comment,
                    block.x,
                    block.y,
                    block.w,
                    block.h,
                    block.userData);
                // newBlock.select(block.selected);
                redoItems.push(newBlock);
            } else if (c.type === 'M') {
                let memo = c;
                let newMemo = new Memo(
                    memo.diagram,
                    memo.id,
                    memo.x,
                    memo.y,
                    memo.w,
                    memo.h,
                    memo.text);
                // newMemo.select(memo.selected);
                redoItems.push(newMemo);
            }
        });
        data.filter(c => c.type === 'L').forEach(c => {
            let link = c;
            let newLink = new Link(
                link.diagram,
                link.id,
                link.caption,
                diagram.components.get(link.blockOrigin.id),
                diagram.components.get(link.blockDest.id),
                link.posOrigin,
                link.posDest,
                false,
                link.moveX,
                link.moveY
            );
            // newLink.select(link.selected);
            redoItems.push(newLink);
        });
        return redoItems;
    }

    undo() {
        this.save = false;
        let item = null;
        this.diagram.removeHelperLine();
        try {
            if (this.actions.length <= 0) {
                return;
            }
            item = this.actions.pop(); // remove last item
            let op = item.op;
            let data = item.data;
            if (this.diagram.options.debugMode) {
                console.log('ActionManager.undo():', op, data);
            }

            if (op === ActionManager.COMPONENTS_ADDED) {
                data.forEach((c) => {
                    if (c.type === 'L') {
                        c.blockOrigin.removeLink(c.id);
                    } else {
                        c.remove();
                    }
                });
            } else if (op === ActionManager.COMPONENTS_REMOVED) {
                // 다른 작업들과는 달리 이 작업은 새로운 블럭 Object 들을 만들게 된다.
                // 그래서 Redo 할 때도 새로운 블럭에 대해 작업해야 한다.
                let redoItems = this.createElements(data);
                item = { op, data: redoItems };
            } else if (op === ActionManager.COMPONENTS_MOVED) {
                // data: { targets, relX, relY }
                let { targets, relX, relY } = data;
                targets.filter(c => c.type !== 'L').forEach(c => {
                    c.setPosition(parseFloat(-relX), parseFloat(-relY), true);
                });
            } else if (op === ActionManager.COMPONENTS_ALIGNED) {
                // data: { type, actions: [ { block, rx, ry }, ... ] }
                let { type, actions } = data;
                actions.forEach(act => {
                    let block = act.block;
                    block.setPosition(-act.rx, -act.ry, true);
                });
            } else if (op === ActionManager.NODE_CAPTION_MODIFIED) {
                let { block, oldValue, newValue } = data;
                block.setCaption(oldValue);
            } else if (op === ActionManager.NODE_COMMENT_MODIFIED) {
                let { block, oldValue, newValue } = data;
                block.setComment(oldValue);
            } else if (op === ActionManager.MEMO_TEXT_MODIFIED) {
                let { memo, oldValue, newValue } = data;
                memo.setText(oldValue);
            } else if (op === ActionManager.COMPONENTS_RESIZED) {
                let { block, w, h } = data;
                block.setRelativeSize(-w, -h, true);
            } else if (op === ActionManager.LINK_CONNECT_CHANGED) {
                let { newLink, originLink } = data;
                newLink.blockOrigin.removeLink(newLink.id);
                /* eslint-disable-next-line no-new */
                new Link(
                    this.diagram,
                    originLink.id,
                    originLink.caption,
                    originLink.anchorFrom.block,
                    originLink.anchorTo.block,
                    originLink.anchorFrom.position,
                    originLink.anchorTo.position
                );
            } else if (op === ActionManager.LINK_SHAPE_CHANGED) {
                let { link, beforeMove, newMove } = data;
                link.adjustPoints(beforeMove.moveX, beforeMove.moveY);
            } else if (op === ActionManager.CUSTOM_EVENT_ADDED) {
                let { block, newEventElement } = data;
                block.eventElementArray.filter((customEventBlock) => {
                    return customEventBlock === newEventElement;
                }).forEach((customEventBlock) => customEventBlock._deleteMenu());
            } else if (op === ActionManager.CUSTOM_EVENT_REMOVED) {
                let { block, id, event } = data;
                const customEventsHeight = block.eventElementArray.length * CUSTOM_EVENT_HEIGHT;
                const eventBlock = new CustomEventBlock(block.diagram, id, event, block, CUSTOM_EVENT_BLOCK, block.x, block.y + block.h + customEventsHeight, block.w, CUSTOM_EVENT_HEIGHT);
                block.eventElementArray.push(eventBlock);
            } else if (op === ActionManager.GROUP_ACTION) {
                data.undo();
            }
        } finally {
            if (item) {
                if (this.redoList.length >= this.action_max) {
                    this.redoList.splice(0, 1);
                }
                this.redoList.push(item);
            }
            this.save = true;
        }
    }

    redo() {
        this.save = false;
        this.diagram.removeHelperLine();
        try {
            if (this.redoList.length <= 0) {
                return;
            }
            let item = this.redoList.pop(); // remove last item
            let op = item.op;
            let data = item.data;
            if (this.diagram.options.debugMode) {
                console.log('ActionManager.redo():', op, data);
            }

            if (op === ActionManager.COMPONENTS_ADDED) {
                this.createElements(data);
            } else if (op === ActionManager.COMPONENTS_REMOVED) {
                data.forEach(c => c.remove());
            } else if (op === ActionManager.COMPONENTS_MOVED) {
                // data: { targets, relX, relY }
                let { targets, relX, relY } = data;
                targets.filter(c => c.type !== 'L').forEach(c => {
                    c.setPosition(parseFloat(relX), parseFloat(relY), true);
                });
            } else if (op === ActionManager.COMPONENTS_ALIGNED) {
                // data: { type, actions: [ { block, rx, ry }, ... ] }
                let { type, actions } = data;
                actions.forEach(act => {
                    let block = act.block;
                    block.setPosition(act.rx, act.ry, true);
                });
            } else if (op === ActionManager.NODE_CAPTION_MODIFIED) {
                let { block, oldValue, newValue } = data;
                block.setCaption(newValue);
            } else if (op === ActionManager.NODE_COMMENT_MODIFIED) {
                let { block, oldValue, newValue } = data;
                block.setComment(newValue);
            } else if (op === ActionManager.MEMO_TEXT_MODIFIED) {
                let { memo, oldValue, newValue } = data;
                memo.setText(newValue);
            } else if (op === ActionManager.COMPONENTS_RESIZED) {
                let { block, w, h } = data;
                block.setRelativeSize(w, h, true);
            } else if (op === ActionManager.LINK_CONNECT_CHANGED) {
                let { newLink, originLink } = data;
                originLink.blockOrigin.removeLink(originLink.id);
                /* eslint-disable */
                new Link(
                    this.diagram,
                    newLink.id,
                    newLink.caption,
                    newLink.anchorFrom.block,
                    newLink.anchorTo.block,
                    newLink.anchorFrom.position,
                    newLink.anchorTo.position
                );
                /* eslint-enable */
            } else if (op === ActionManager.LINK_SHAPE_CHANGED) {
                let { link, beforeMove, newMove } = data;
                link.adjustPoints(newMove.moveX, newMove.moveY);
            } else if (op === ActionManager.CUSTOM_EVENT_ADDED) {
                let { block, newEventElement } = data;
                const customEventsHeight = block.eventElementArray.length * CUSTOM_EVENT_HEIGHT;
                const customEventBlock = new CustomEventBlock(block.diagram, newEventElement.id, newEventElement.event, block, CUSTOM_EVENT_BLOCK, block.x, block.y + block.h + customEventsHeight, block.w, CUSTOM_EVENT_HEIGHT);
                block.eventElementArray.push(customEventBlock);
                this.accumulatedHeight += CUSTOM_EVENT_HEIGHT;
            } else if (op === ActionManager.CUSTOM_EVENT_REMOVED) {
                let { block, event } = data;
                block.eventElementArray.forEach((item) => {
                    if (item.event === event) {
                        item._deleteMenu();
                    }
                });
            } else if (op === ActionManager.GROUP_ACTION) {
                data.redo();
            }
        } finally {
            this.save = true;
        }
    }
}

ActionManager.COMPONENTS_ADDED = 'COMPONENTS_ADDED';
ActionManager.COMPONENTS_REMOVED = 'COMPONENTS_REMOVED';
ActionManager.COMPONENTS_MOVED = 'COMPONENTS_MOVED';
ActionManager.COMPONENTS_ALIGNED = 'COMPONENTS_ALIGNED';
ActionManager.NODE_CAPTION_MODIFIED = 'NODE_CAPTION_MODIFIED';
ActionManager.NODE_COMMENT_MODIFIED = 'NODE_COMMENT_MODIFIED';
ActionManager.MEMO_TEXT_MODIFIED = 'MEMO_TEXT_MODIFIED';
ActionManager.COMPONENTS_RESIZED = 'COMPONENTS_RESIZED';
ActionManager.LINK_CONNECT_CHANGED = 'LINK_CONNECT_CHANGED';
ActionManager.LINK_SHAPE_CHANGED = 'LINK_SHAPE_CHANGED';
ActionManager.CUSTOM_EVENT_ADDED = 'CUSTOM_EVENT_ADDED';
ActionManager.CUSTOM_EVENT_REMOVED = 'CUSTOM_EVENT_REMOVED';
// data: { undo: () => void, redo: () => void } — closures owned by blockGrouping.js.
// This op is deliberately generic: the library only ever calls whichever closure it's
// handed, so it never needs to know what "grouping" means (see blockGrouping.js).
ActionManager.GROUP_ACTION = 'GROUP_ACTION';

/**
 * UIComponent
 */
class UIComponent {
    /**
     * @example
     * @param {Diagram} diagram
     * @param {string} type
     * @param {number} id
     */
    constructor(diagram, type, id) {
        this.diagram = diagram;
        this.type = type;
        this.id = id;
        this.svg = diagram.svg;
        this.selected = false;

        if (diagram.components.get(this.id)) {
            throw new Error('Component already exists: ' + this.id);
        }
        diagram.components.set(this.id, this);
    }

    setPosition(newX, newY, isRelative) {
        if (isRelative) {
            newX += this.x;
            newY += this.y;
        }

        // 다수의 객체들을 움직이기 위해서는 transform 을 사용하거나
        // 또는 SVG Group 을 사용하는 것도 고려해 보는 것이 좋겠음.
        let moveUnit = this.diagram.options.moveUnit;
        if (moveUnit) {
            let remainX = newX % moveUnit;
            let remainY = newY % moveUnit;
            newX = Math.abs(remainX) > moveUnit / 2 ? newX + (newX > 0 ? moveUnit : -moveUnit) - remainX : newX - remainX;
            newY = Math.abs(remainY) > moveUnit / 2 ? newY + (newY > 0 ? moveUnit : -moveUnit) - remainY : newY - remainY;
        }
        let relX = newX - this.x;
        let relY = newY - this.y;
        this.x = newX;
        this.y = newY;
        this.movePosition(relX, relY, newX, newY, false);
    }

    movePosition(relX, reY, newX, newY) {
        throw new Error('Abstract method');
    }

    select() {
        throw new Error('Abstract method');
    }

    unselect() {
        throw new Error('Abstract method');
    }

    toggleSelect() {
        if (this.selected) {
            this.unselect();
        } else {
            this.select();
        }
    }

    remove() {
        throw new Error('Abstract method');
    }
}

class ResizableComponent extends UIComponent {
    /**
     * @param {Number} width Relative width value
     * @param {Number} height Relative height value
     * @param {Boolean} skip skip action manager
     */
    setRelativeSize(wChange, hChange, skip = false) {
        if (!this.alignRelativeSize(wChange, hChange)) {
            return;
        }

        if (!skip) {
            let data = { block: this, w: wChange, h: hChange };
            this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, data.block, ModifyEventTypes.NodeResized);
            this.diagram.actionManager.append(ActionManager.COMPONENTS_RESIZED, data);
        }
    }

    alignRelativeSize(width, height) {
        throw new Error('Abstract method');
    }

    setColor(bgColor, iconColor) {
        const colorPallete = this.diagram.options.colorPallete;

        const bgColorInPallete = Object.keys(colorPallete).find(key => key === bgColor);
        const bgColorVal = bgColorInPallete ? colorPallete[bgColorInPallete] : undefined;

        const iconColorInPallete = Object.keys(colorPallete).find(key => key === iconColor);
        const iconColorVal = iconColorInPallete ? colorPallete[iconColorInPallete] : undefined;

        this.shapeElement.style.fill = bgColorVal;
        this.iconArea.style.backgroundColor = iconColorVal;
    }
}

/**
 * @example
 * @param {object} block block object
 * @param {string} position anchor position on block ('T', 'B', 'L', 'R')
 * @param {number} x anchor x position
 * @param {number} y anchor y position
 * @returns {object} svg element
 */
class AnchorGroup {
    constructor(diagram) {
        this.diagram = diagram;
        this.svg = diagram.svg;
        this.anchors = {};
    }

    add(block, positionKey, cx, cy) {
        let anchor = new Anchor(
            this.diagram,
            block,
            positionKey,
            cx,
            cy);
        this.anchors[positionKey] = anchor;
        this.svg.appendChild(anchor.magnet);
        this.svg.appendChild(anchor.element);
    }

    get(positionKey) {
        return this.anchors[positionKey];
    }

    setVisible(isVisible) {
        for (let anchor of Object.values(this.anchors)) {
            anchor.setVisible(isVisible);
        }
    }

    movePosition(relX, relY) {
        for (let anchor of Object.values(this.anchors)) {
            anchor.movePosition(relX, relY);
        }
    }

    remove() {
        for (let anchor of Object.values(this.anchors)) {
            this.svg.removeChild(anchor.element);
        }
    }
}

/**
 * @example
 * @param {object} block block object
 * @param {string} position anchor position on block ('T', 'B', 'L', 'R')
 * @param {number} x anchor x position
 * @param {number} y anchor y position
 * @returns {object} svg element
 */
class Anchor {
    constructor(diagram, block, position, x, y, custom) {
        this.element = __makeSvgElement('circle', {
            cx: x,
            cy: y,
            r: ANCHOR_RADIUS,
            'stroke-width': 1,
            'data-pos': position, // for debuging purposes
            stroke: 'rgb(100, 100, 100)',
            fill: 'rgb(100, 100, 100)',
        }, []);

        // Magnet 요소 생성 (Anchor 주위의 감지 영역)
        this.magnet = __makeSvgElement('circle', {
            cx: x,
            cy: y,
            r: ANCHOR_RADIUS * 2, // Anchor 2배 크기
            'fill-opacity': 0, // 완전히 투명하게 설정
            'stroke-opacity': 0 // 시각적으로 보이지 않도록 설정
            // stroke: 'rgb(100, 100, 100)',
            // fill: 'rgb(100, 100, 100)',
        }, []);

        this.setVisible(false);

        this.diagram = diagram;
        this.block = block;
        this.position = position;
        this.x = x;
        this.y = y;
        this.custom = custom;
        this.clickedElement = false;

        this.element.addEventListener('mouseenter', e => this._mouseenter(e));
        this.element.addEventListener('mousedown', e => this._mousedown(e));
        this.element.addEventListener('mouseup', e => this._mouseup(e));
        this.element.addEventListener('mouseleave', e => this._mouseleave(e));

        this.magnet.addEventListener('mouseenter', e => this._magnetenter(e));
        this.magnet.addEventListener('mouseup', e => this._mouseup(e));
        this.magnet.addEventListener('mouseleave', e => this._mouseleave(e));
    }

    movePosition(x, y, isRelative = true) {
        if (isRelative) {
            this.x += x;
            this.y += y;
        } else {
            this.x = x;
            this.y = y;
        }
        __setSvgAttrs(this.element, { cx: this.x, cy: this.y });
        __setSvgAttrs(this.magnet, { cx: this.x, cy: this.y });
    }

    setHover() {
        __setSvgAttrs(this.element, {
            'fill-opacity': '0.4',
            'stroke-opacity': '0.6',
            cursor: 'crosshair',
        });
    }

    setVisible(isVisible) {
        if (isVisible) {
            __setSvgAttrs(this.element, {
                'fill-opacity': '0.0',
                'stroke-opacity': '0.7',
                cursor: '',
            });
        } else {
            __setSvgAttrs(this.element, {
                'fill-opacity': '0.0',
                'stroke-opacity': '0.0',
                cursor: '',
            });
        }
    }

    _magnetenter(e) {
        let diagram = this.diagram;
        let element = this.element;
        if (diagram.selectionBox) {
            return;
        }
        // 마우스를 클릭한 상태에서 내가 아닌 Anchor로 인입
        if (e.buttons === MOUSE_BUTTON_PRIMARY && !this.clickedElement) {
            this.diagram.activeAnchor = this;
        }

        e.stopPropagation();
    }

    _mouseenter(e) {
        let diagram = this.diagram;
        let element = this.element;
        if (diagram.selectionBox) {
            return;
        }
        this.setHover();
        this.diagram.activeAnchor = this;
        e.stopPropagation();
    }

    _mousedown(e) {
        let diagram = this.diagram;
        this.clickedElement = true;
        const line = __makeSvgElement('line', {
            x1: this.x,
            y1: this.y,
            x2: this.x,
            y2: this.y,
            stroke: 'gray',
            'stroke-dasharray': '5 2',
            'stroke-width': 2,
            'stroke-opacity': 0.9,
            'pointer-events': 'none'
        }, []);
        diagram.svg.appendChild(line);
        e.stopPropagation();
        diagram.creatingLinkOrigin = this;
        diagram.creatingLinkLine = line;
        console.log('마우스 다운 이벤트 발생, creatingLinkOrigin:', diagram.creatingLinkOrigin);
    }

    _mouseup(e) {
        let diagram = this.diagram;
        console.log('Anchor._mouseup() diagram.movingLine:', diagram.movingLine);
        if (diagram.movingLine) {
            let originLink = this.diagram.movingLine.originLink;
            originLink.remove();
            let link = new Link(diagram,
                originLink.id,
                originLink.caption,
                originLink.anchorFrom.block,
                this.block,
                originLink.anchorFrom.position,
                this.position,
                true
            );
            console.log('Anchor._mouseup() link:', link);
            let data = { newLink: link, originLink };
            diagram.actionManager.append(ActionManager.LINK_CONNECT_CHANGED, data);
            diagram.svg.removeChild(diagram.movingLine.tempLine);
            diagram.movingLine = null;
        } else {
            if (!diagram.creatingLinkOrigin) {
                return;
            }
            let origin = diagram.creatingLinkOrigin;
            let line = diagram.creatingLinkLine;
            diagram.creatingLinkOrigin.setVisible(false);
            diagram.svg.removeChild(line);

            if (origin !== this) {
                if (diagram.options.lineType === NORMAL_DIAGRAM_TYPE) {
                    new Promise((resolve) => {
                        if (diagram.options.onLinkCreating) {
                            diagram.fireEvent(EVENT_LINK_CREATING, origin.block, e, value => {
                                // TODO: 사용자가 결과값을 주기 위한 콜백을 호출하지 않는 경우
                                // resolve() 할 수 없다. 이 경우에 Promise 는 어떻게 되는가?
                                resolve(value);
                            });
                        } else {
                            resolve(prompt('Enter event name:'));
                        }
                    }).then((caption) => {
                        if (caption && caption.trim()) {
                            let link = new Link(diagram,
                                diagram.generateId(),
                                caption,
                                origin.block,
                                this.block,
                                origin.position,
                                this.position);
                            diagram.actionManager.append(ActionManager.COMPONENTS_ADDED, [link]);
                        } else {
                            // Cancelled
                        }
                    });
                } else {
                    if (origin.block.detailType === CUSTOM_BLOCK || this.block.type === CUSTOM_EVENT_BLOCK) {
                        // 커스텀 블럭에서 링크가 나가거나 커스텀 이벤트 블럭으로 링크가 들어올 때
                        // Cancelled
                    } else {
                        if (origin.block.link && origin.block.type === CUSTOM_EVENT_BLOCK) {
                            console.warn('line is already linked');
                        } else {
                            let link = new Link(diagram,
                                diagram.generateId(),
                                origin.position,
                                origin.block,
                                this.block,
                                origin.position,
                                this.position
                            );
                            origin.block.link = link.id;
                            if (origin.block.type === CUSTOM_EVENT_BLOCK) {
                                origin.block.actionDivContainer.dataset.linkId = link.id;
                            }
                            diagram.actionManager.append(ActionManager.COMPONENTS_ADDED, [link]);
                        }
                    }
                }
            }
            diagram.creatingLinkOrigin = null;
            diagram.creatingLinkLine = null;
        }
        e.stopPropagation();
    }

    _mouseleave(e) {
        let diagram = this.diagram;
        let element = this.element;
        if (diagram.selectionBox) {
            return;
        }
        if (diagram.creatingLinkOrigin !== this) {
            this.setVisible(false);
        }
        this.diagram.activeAnchor = null;
        e.stopPropagation();
    }
};

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} shape block shape [Rectangle, Diamond, Circle, Memo]
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class Block extends ResizableComponent {
    static createInstance(diagram, id, shape, icon, metaName, caption, comment, x, y, w, h, userData, event, color) {
        x = parseFloat(x);
        y = parseFloat(y);
        let block = null;
        if (color === undefined) {
            color = {
                bgColor: '#ededed',
                iconColor: '#ababab'
            };
        }
        if (shape === RECT_BLOCK_SHAPE) {
            if (diagram.options.blockType === NORMAL_DIAGRAM_TYPE) {
                block = new Rectangle2Block(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, event, color);
            } else if (diagram.options.blockType === CUSTOM_DIAGRAM_TYPE) {
                block = new CustomBlock(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, event, color);
            }
        } else if (shape === CIRCLE_BLOCK_SHAPE) {
            block = new CircleBlock2(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, color);
        } else if (shape === DIAMOND_BLOCK_SHAPE) {
            block = new DiamondBlock2(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, color);
        } else {
            throw new Error('Invalid shape: ' + shape);
        }

        if (diagram.ready) {
            diagram.fireEvent(EVENT_NODE_CREATED, block);
            diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, block, ModifyEventTypes.NodeAdded);
        }
        return block;
    }

    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, classPrefix) {
        super(diagram, 'B', id);
        this.icon = icon;
        this.metaName = metaName;
        this.caption = caption;
        this.comment = comment;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.links = new Map();
        this.userData = userData;
        this.classPrefix = classPrefix;
        this.sizeModifiable = false;
        this.inLinks = [];
        this.outLinks = [];

        // TODO: block입장에서 input, output Link를 구분해서 정의해야함
        // for (const value of this.links.values()) {
        //     const block = this.id;
        //     if (block === value.blockDest.id) {
        //         this.inLinks = value;
        //     } else if (block === value.blockOrigin.id) {
        //         this.outLinks = value;
        //     }
        // }
        // console.log(this.links);
    }

    setPosition(newX, newY, isRelative) {
        super.setPosition(newX, newY, isRelative);
        if (!isRelative) {
            newX -= this.x;
            newY -= this.y;
        }
        this.links.forEach((link) => {
            if (this.id === link.blockOrigin.id) {
                link.adjustControlPoints(newX, newY);
            }
            if (this.id === link.blockDest.id) {
                link.adjustControlPoints2(newX, newY);
            }
            link.adjustPoints(link.moveX, link.moveY);
        });
    }

    /**
     * @param {String} value
     */
    setCaption(value) {
        // let divElement = this.captionElement.children[0];
        let divElement = this.captionElement;
        divElement.textContent = value;
        this.caption = value;
    }

    /**
     * @param {String} value
     */
    setComment(value) {
        // let divElement = this.commentElement.children[0];
        let divElement = this.commentElement;
        divElement.textContent = value;
        this.comment = value;
    }

    select() {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        if (!this.selected) {
            this.shapeElement.classList.add(this.classPrefix + '-selected');
            this.selected = true;
            this.diagram.appendToSelection(this);
            this.diagram.fireEvent(EVENT_NODE_SELECTED, this, 'nodeSelected');
            const type = this.shapeElement.getAttributeNS(null, 'data-type');
            if (type === 'custom-block') {
                this.blockMenu.style.visibility = 'visible';
                this.blockMenuArea.style.visibility = 'visible';
            }
        }
    }

    unselect() {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        if (this.selected) {
            this.shapeElement.classList.remove(this.classPrefix + '-selected');
            this.selected = false;
            this.diagram.fireEvent(EVENT_NODE_UNSELECTED, this, 'nodeUnSelected');
            this.diagram.removeFromSelection(this);
            let customBlock = this.shapeElement.getAttributeNS(null, 'data-type');
            if (customBlock === 'custom-block') {
                this.blockMenu.style.visibility = 'hidden';
                this.blockMenuArea.style.visibility = 'hidden';
            }
        }
    }

    remove() {
        if (this.eventElementArray) {
            this.eventElementArray.forEach((element) => {
                this.svg.removeChild(element.shapeElement);
                this.svg.removeChild(element.addActionArea);
                element.anchors.remove();
            });
        }
        this.svg.removeChild(this.shapeElement);
        this.svg.removeChild(this.rootElement);
        // NOTE:
        //   rootElement 의 child 이므로 자동으로 메모리에서
        //   제거될 것으로 예상됨. 그렇지 않다면 수동으로 제거해야 함.
        // this.svg.removeChild(this.iconElement);
        // this.svg.removeChild(this.captionElement);
        // this.svg.removeChild(this.commentElement);
        this.anchors.remove();
        for (let c of this.links.values()) {
            c.remove();
        }
        this.diagram.components.delete(this.id);
        this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.NodeRemoved);
    }

    removeLink(id) {
        console.log(id);
        // TODO: removeLink를 주석처리했는데도 문제가 없는 것에대한 확인이 필요함
        // let link = this.links.get(id);
        // console.log(link);
        // link.remove();
    }

    _mousedblclick(e) {
        if (this.diagram.isLocked()) {
            return;
        }
        let diagram = this.diagram;
        let block = this;
        if (e.ctrlKey) {
            if (diagram.options.onNodeModifyingComment) {
                new Promise((resolve) => {
                    let oldValue = this.comment;
                    diagram.options.onNodeModifyingComment(this, oldValue, newValue => {
                        resolve(newValue);
                    });
                }).then(newValue => {
                    if (this.diagram.options.debugMode) {
                        console.log(`comment: new=${newValue}`);
                    }
                    let undoData = { block, oldValue: this.comment, newValue };
                    if (newValue !== null && this.comment !== newValue) {
                        this.setComment(newValue);
                        diagram.actionManager.append(ActionManager.NODE_COMMENT_MODIFIED, undoData);
                        diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, block, ModifyEventTypes.NodeCommentModified);
                    }
                });
            }
        } else {
            if (diagram.options.onNodeModifyingCaption) {
                new Promise((resolve) => {
                    let oldValue = this.caption;
                    diagram.options.onNodeModifyingCaption(this, oldValue, newValue => {
                        resolve(newValue === '' ? null : newValue);
                    });
                }).then(newValue => {
                    if (this.diagram.options.debugMode) {
                        console.log(`caption: new=${newValue}`);
                    }
                    let undoData = { block, oldValue: this.caption, newValue };
                    if (newValue !== null && newValue !== this.caption) {
                        console.log(newValue);
                        this.setCaption(newValue);
                        diagram.actionManager.append(ActionManager.NODE_CAPTION_MODIFIED, undoData);
                        diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, block, ModifyEventTypes.NodeCaptionModified);
                    }
                });
            }
        }
    }

    _mouseenter(e) {
        if (this.diagram.selectionBox) {
            return;
        }
        this.anchors.setVisible(true);
    }

    _mouseleave(e) {
        if (this.diagram.selectionBox) {
            return;
        }
        this.anchors.setVisible(false);
    }

    initialize() {
        this.shapeElement.addEventListener('mouseenter', e => this._mouseenter(e));
        this.shapeElement.addEventListener('mouseleave', e => this._mouseleave(e));
        this.shapeElement.addEventListener('dblclick', e => this._mousedblclick(e));
        this.movePosition(0, 0, this.x, this.y, true);
    }

    /**
     * @param {Block} block
     * @param {NodeWrapper} node
     */
    static serialize(block, node) {
        node.attr('id', block.id);
        node.attr('desc', block.caption);
        node.attr('comment', block.comment);
        node.attr('meta-name', block.metaName);
        node.attr('bg-color', block.shapeElement.style.fill);
        node.attr('icon-color', block.iconArea.style.backgroundColor);

        let svgNode = node.appendChild('svg', null);
        let boundsNode = svgNode.appendChild('bounds');
        boundsNode.value(`${block.x},${block.y},${block.w},${block.h}`);

        if (block.userData) {
            node.appendNode(block.userData);
        }

        if (block.eventElementArray && block.eventElementArray.length > 0) {
            for (const eventBlock of block.eventElementArray) {
                let cnode = svgNode.appendChild('event-block');
                cnode.attr('event', eventBlock.event);
                // cnode.attr('id', eventBlock.id);
                // if (eventBlock.link) {
                //     cnode.attr('link', eventBlock.link);
                // } else {
                //     cnode.attr('link', null);
                // }
            }
        }

        for (let link of block.links.values()) {
            if (block.eventElementArray && block.eventElementArray.length > 0) {
                if (link.blockDest !== block) {
                    Link.serialize(link, node, block, CUSTOM_BLOCK);
                }
            } else {
                if (link.blockDest !== block) {
                    Link.serialize(link, node, block);
                }
            }
        }
    }

    /**
     * @param {Block} block
     * @param {NodeWrapper} node
     */
    static serializeToJSON(block) {
        const id = block.id;
        const desc = block.caption;
        const comment = block.comment;
        const metaName = block.metaName;

        const bounds = `${block.x},${block.y},${block.w},${block.h}`;
        const selected = block.selected;
        const userdata = block.userData;
        const userdataNode = userdata.node.nodeName;

        let jsonBlockData = {
            svg: {
                bounds,
                selected
            }
        };

        for (let link of block.links.values()) {
            if (block.eventElementArray && block.eventElementArray.length > 0) {
                if (link.blockDest !== block) {
                    const choiceJSON = Link.serializeToJSON(link, block, CUSTOM_BLOCK);
                    jsonBlockData.choice = choiceJSON;
                }
            } else {
                if (link.blockDest !== block) {
                    const choiceJSON = Link.serializeToJSON(link, block);
                    jsonBlockData.choice = choiceJSON;
                }
            }
        }

        jsonBlockData[userdataNode] = {};
        // userData의 하위노드있는지 체크
        if (userdata.node.hasChildNodes()) {
            for (let i = 0; i < userdata.node.childNodes.length; i++) {
                const item = userdata.node.childNodes.item(i);
                if (item.nodeType === 1) {
                    const nodeName = item.nodeName;
                    jsonBlockData[userdataNode][nodeName] = item.textContent.trim();
                }
            }
        }
        jsonBlockData._id = id;
        jsonBlockData._desc = desc;
        jsonBlockData._comment = comment;
        jsonBlockData['_meta-name'] = metaName;

        return jsonBlockData;
    }

    /**
     * @param {Diagram} diagram
     * @param {NodeWrapper} node
     * @returns {Block} new block object
     */
    static deserialize(diagram, node) {
        let id = node.attr('id');
        let desc = node.attr('desc');
        let comment = node.attr('comment');
        let metaName = node.attr('meta-name');
        let nodeDef = diagram.meta.nodes[metaName];
        let bounds = node.child('svg/bounds').value();
        let [x, y, w, h] = bounds.split(',');
        let userData = node.child(nodeDef.buildTag);
        let event = [];
        let bgColor = node.attr('bg-color');
        let iconColor = node.attr('icon-color');
        let color = { bgColor, iconColor };

        // 이전버전의 choice 방식인지, 최근 버전인지 판단하기 위한 로직
        if (node.children('svg/event-block').length > 0) {
            for (let nodeSub of node.children('svg/event-block')) {
                event.push(nodeSub.attr('event'));
            }
        } else {
            for (let nodeSub of node.children('choice')) {
                event.push(nodeSub.attr('event'));
            }
        }

        let block = Block.createInstance(
            diagram,
            id,
            nodeDef.shape || 'Rectangle',
            nodeDef.icon,
            metaName,
            desc,
            comment == null ? '' : comment,
            x,
            y,
            w,
            h,
            userData,
            event,
            color
        );

        return block;
    }

    /**
     * @param {Diagram} diagram
     * @param {NodeWrapper} node
     * @returns {Block} new block object
     */
    static deserializeToJSON(diagram, node) {
        let id = node._id;
        let desc = node._desc;
        let comment = node._comment;
        let metaName = node['_meta-name'];
        let nodeDef = diagram.meta.nodes[metaName];
        let bounds = node.svg.bounds;
        let [x, y, w, h] = bounds.split(',');
        let userData = new NodeWrapper(nodeDef.buildTag);
        let event = [];

        if (Array.isArray(node.choice)) {
            // node.choice가 배열일 때
            for (let nodeSub of node.choice) {
                event.push(nodeSub);
            }
        } else if (node.choice) {
            event.push(node.choice);
        }

        let block = Block.createInstance(
            diagram,
            id,
            nodeDef.shape || 'Rectangle',
            nodeDef.icon,
            metaName,
            desc,
            comment == null ? '' : comment,
            x,
            y,
            w,
            h,
            userData,
            event
        );

        return block;
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class RectangleBlock extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData) {
        super(diagram, id, icon, metaName, caption, comment, x, y,
            BLOCK_RECT_DEFAULT_WIDTH, BLOCK_RECT_DEFAULT_HEIGHT, userData, 'hd-block');

        const svg = diagram.svg;
        this.shape = 'Rectangle';
        this.iconOffset = this.w * 0.05;
        this.iconSize = Math.min(24, Math.min(this.w, this.h) - (this.iconOffset * 2));

        this.shapeElement = __makeSvgElement('rect', {
            'data-id': this.id,
            rx: Math.min(this.w, this.h) * 0.1,
            width: this.w,
            height: this.h
        }, [this.classPrefix, 'draggable']);

        // href 에 inline data uri 를 사용하는 경우에는 data 부분이 적절히 encoding 되어야 한다.
        // PNG 예) data:image/png;base64,iVBORw0KGgoAAAANS...==">
        // SVG 예) data:image/svg+xml;base64,MTUuMDcgMS4yNmMtLjU5L...">
        // SVG 예) data:image/svg+xml,<svg fill="%23000000"...</svg>
        //         (base64 가 아니라면 encodeURI() 등의 인코딩 필요. # => %23 특히 중요)
        this.iconElement = __makeSvgElement('image', {
            href: icon,
            width: this.iconSize,
            height: this.iconSize,
            style: 'pointer-events: none',
        });

        this.captionElement = __makeSvgTextElement(
            this.w,
            this.h,
            BLOCK_FONT_SIZE,
            caption);

        this.commentElement = __makeSvgTextElement(
            this.w,
            this.h,
            BLOCK_FONT_SIZE,
            comment);

        let divElement = this.commentElement.children[0];
        divElement.style.color = '#777';

        svg.appendChild(this.shapeElement);
        svg.appendChild(this.iconElement);
        svg.appendChild(this.captionElement);
        svg.appendChild(this.commentElement);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, L_POSITION, x, y + (this.h / 2));
        this.anchors.add(this, R_POSITION, x + this.w, y + (this.h / 2));
        this.anchors.add(this, T_POSITION, x + (this.w / 2), y);
        this.anchors.add(this, B_POSITION, x + (this.w / 2), y + this.h);

        this.initialize();
    }

    movePosition(relX, relY, newX, newY) {
        this.shapeElement.setAttributeNS(null, 'x', newX);
        this.shapeElement.setAttributeNS(null, 'y', newY);
        this.iconElement.setAttributeNS(null, 'x', newX + this.iconOffset);
        this.iconElement.setAttributeNS(null, 'y', newY + this.iconOffset);
        this.captionElement.setAttributeNS(null, 'x', newX + 30);
        this.captionElement.setAttributeNS(null, 'y', newY + 3);
        this.commentElement.setAttributeNS(null, 'x', newX);
        this.commentElement.setAttributeNS(null, 'y', newY + 15);
        this.anchors.movePosition(relX, relY);
        if (this.diagram.ready) {
            this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.NodeMoved);
        }
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class Rectangle2Block extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, event, color) {
        super(diagram, id, icon, metaName, caption, comment, parseFloat(x), parseFloat(y),
            parseFloat(w) || BLOCK_RECT_DEFAULT_WIDTH,
            parseFloat(h) || BLOCK_RECT_DEFAULT_HEIGHT, userData, 'hd-block2');

        const svg = diagram.svg;
        this.shape = RECT_BLOCK_SHAPE;
        this.sizeModifiable = true;

        let iconSize = 22;
        let iconAreaWidth = 30;
        let fontSize = BLOCK_FONT_SIZE;
        let fontSize2 = 12;
        let lineHeight = 16;
        let radius = 5;

        // shapeElement: 블럭의 형태를 나타내주고 마우스 이벤트의
        // target 으로 작동하여 드래그가 가능하게 해주는 Element.
        this.shapeElement = __makeSvgElement('rect', {
            'data-id': this.id,
            rx: radius + 'px',
            width: this.w,
            height: this.h
        }, [this.classPrefix, 'draggable']);

        // rootElement: shapeElement 를 제외한, 블럭의 나머지 Element
        // 들의 Parent 로써 작동하는 Element. 다수의 Element 를 동시에
        // 움직일수 있도록 해주며, 블럭안에 요소들의 배치를 쉽게 만들어 준다.
        this.rootElement = __makeSvgElement('foreignObject', {
            width: this.w,
            height: this.h,
            style: 'position: relative; pointer-events: none;'
        });

        this.iconArea = document.createElement('div');
        this.iconArea.className = `svg-text ${this.classPrefix + '-iconarea'}`;
        this.iconArea.style.cssText = `
            position: absolute;
            width: ${iconAreaWidth}px;
            height: calc(100% - 7px);
            margin: 4px;
            border-radius: ${radius}px;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;`;

        let textArea = document.createElement('div');
        textArea.className = `svg-text ${this.classPrefix + '-textarea'}`;
        textArea.style.cssText = `
            position: absolute;
            left: ${iconAreaWidth + 8}px;
            width: ${this.w - iconAreaWidth - 8}px;
            height: 100%;
            display: table;
            line-height: ${lineHeight}px;
            pointer-events: none;`;

        // href 에 inline data uri 를 사용하는 경우에는 data 부분이 적절히 encoding 되어야 한다.
        // PNG 예) data:image/png;base64,iVBORw0KGgoAAAANS...==">
        // SVG 예) data:image/svg+xml;base64,MTUuMDcgMS4yNmMtLjU5L...">
        // SVG 예) data:image/svg+xml,<svg fill="%23000000"...</svg>
        //         (base64 가 아니라면 encodeURI() 등의 인코딩 필요. # => %23 특히 중요)
        let iconElement = document.createElement('img');
        iconElement.src = icon;
        iconElement.style.cssText = `
            height: ${iconSize}px;
            width: ${iconSize}px;
            display: table-cell;
            vertical-align: middle;
            pointer-events: none;`;

        let centeredArea = document.createElement('div');
        centeredArea.style.cssText = `
            width: ${this.w - iconAreaWidth}px;
            white-space: pre;
            display: table-cell;
            vertical-align: middle;`;

        this.shapeElement.style.fill = color.bgColor;
        this.iconArea.style.backgroundColor = color.iconColor;

        this.captionElement = document.createElement('span');
        this.captionElement.className = 'svg-text';
        this.captionElement.contentEditable = false;
        this.captionElement.style.cssText = `font-size: ${fontSize}px`;
        this.captionElement.innerHTML = caption;

        this.commentElement = document.createElement('span');
        this.commentElement.className = 'svg-text';
        this.commentElement.contentEditable = false;
        this.commentElement.style.cssText = `font-size: ${fontSize2}px; color: #777;`;
        this.commentElement.innerHTML = comment;

        this.iconArea.appendChild(iconElement);
        centeredArea.appendChild(this.captionElement);
        centeredArea.appendChild(document.createElement('br'));
        centeredArea.appendChild(this.commentElement);
        textArea.appendChild(centeredArea);

        this.rootElement.appendChild(this.iconArea);
        this.rootElement.appendChild(textArea);

        svg.appendChild(this.shapeElement);
        svg.appendChild(this.rootElement);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, L_POSITION, x, y + (this.h / 2));
        this.anchors.add(this, R_POSITION, x + this.w, y + (this.h / 2));
        this.anchors.add(this, T_POSITION, x + (this.w / 2), y);
        this.anchors.add(this, B_POSITION, x + (this.w / 2), y + this.h);

        this.initialize();
    }

    movePosition(relX, relY, newX, newY, initial) {
        this.shapeElement.setAttributeNS(null, 'x', newX);
        this.shapeElement.setAttributeNS(null, 'y', newY);
        this.rootElement.setAttributeNS(null, 'x', newX);
        this.rootElement.setAttributeNS(null, 'y', newY);
        this.anchors.movePosition(relX, relY);

        if (!initial) {
            this.diagram.drawHelperLine(newX, newY, this.w, this.h, this.id);
        }
    }

    /**
     * @param {Number} w Relative width value
     * @param {Number} h Relative width value
     */
    alignRelativeSize(w, h) {
        if (this.diagram.isLocked()) {
            return false;
        }
        if (this.sizeModifiable && (w !== 0 || h !== 0)) {
            let _w = this.w;
            let _h = this.h;
            this.w += w;
            this.h += h;
            if (this.w < BLOCK_RECT_DEFAULT_WIDTH) {
                this.w = BLOCK_RECT_DEFAULT_WIDTH;
            }
            if (this.h < BLOCK_RECT_DEFAULT_HEIGHT) {
                this.h = BLOCK_RECT_DEFAULT_HEIGHT;
            }

            w = this.w - _w;
            h = this.h - _h;

            this.shapeElement.setAttributeNS(null, 'width', this.w);
            this.shapeElement.setAttributeNS(null, 'height', this.h);
            this.rootElement.setAttributeNS(null, 'width', this.w);
            this.rootElement.setAttributeNS(null, 'height', this.h);
            this.anchors.get(L_POSITION).movePosition(this.x, this.y + (this.h / 2), false);
            this.anchors.get(R_POSITION).movePosition(this.x + this.w, this.y + (this.h / 2), false);
            this.anchors.get(T_POSITION).movePosition(this.x + (this.w / 2), this.y, false);
            this.anchors.get(B_POSITION).movePosition(this.x + (this.w / 2), this.y + this.h, false);

            this.links.forEach((link) => {
                if (this.id === link.blockOrigin.id) {
                    if (w !== 0) {
                        if (link.posOrigin === R_POSITION) {
                            // TODO : lineType이 Normal일 때만 adjustControlPoints를 호출해야하는지에 대한 여부
                            link.adjustControlPoints(w, 0);
                        } else if (link.posOrigin === T_POSITION || link.posOrigin === B_POSITION) {
                            link.adjustControlPoints(w / 2, 0);
                        }
                    }
                    if (h !== 0) {
                        if (link.posOrigin === B_POSITION) {
                            link.adjustControlPoints(0, h);
                        } else if (link.posOrigin === L_POSITION || link.posOrigin === R_POSITION) {
                            link.adjustControlPoints(0, h / 2);
                        }
                    }
                }
                if (this.id === link.blockDest.id) {
                    if (w !== 0) {
                        if (link.posDest === R_POSITION) {
                            link.adjustControlPoints2(w, 0);
                        } else if ((link.posDest === T_POSITION || link.posDest === B_POSITION)) {
                            link.adjustControlPoints2(w / 2, 0);
                        }
                    }
                    if (h !== 0) {
                        if (link.posDest === B_POSITION) {
                            link.adjustControlPoints2(0, h);
                        } else if ((link.posDest === L_POSITION || link.posDest === R_POSITION)) {
                            link.adjustControlPoints2(0, h / 2);
                        }
                    }
                }
                link.adjustPoints(link.moveX, link.moveY);
            });
            return true;
        }
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class CircleBlock extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData) {
        super(diagram, id, icon, metaName, caption, comment, x, y,
            BLOCK_CIRCLE_RADIUS * 2, BLOCK_CIRCLE_RADIUS * 2, userData, 'hd-block');

        const svg = diagram.svg;
        this.shape = 'Circle';
        this.radius = this.w / 2;
        this.iconSize = this.radius * 0.9;

        this.shapeElement = __makeSvgElement('circle', {
            'data-id': this.id,
            cx: x + this.radius,
            cy: y + this.radius,
            r: this.radius,
        }, [this.classPrefix, 'draggable']);

        this.iconElement = __makeSvgElement('image', {
            href: icon,
            width: this.iconSize,
            height: this.iconSize,
            style: 'pointer-events: none',
        });

        this.captionElement = __makeSvgTextElement(
            this.w,
            this.h,
            BLOCK_FONT_SIZE,
            caption);

        this.commentElement = __makeSvgTextElement(
            this.w,
            this.h,
            BLOCK_FONT_SIZE,
            comment);

        svg.appendChild(this.shapeElement);
        svg.appendChild(this.iconElement);
        svg.appendChild(this.captionElement);
        svg.appendChild(this.commentElement);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, L_POSITION, x, y + (this.h / 2));
        this.anchors.add(this, R_POSITION, x + this.w, y + (this.h / 2));
        this.anchors.add(this, T_POSITION, x + (this.w / 2), y);
        this.anchors.add(this, B_POSITION, x + (this.w / 2), y + this.h);

        this.initialize();
    }

    movePosition(relX, relY, newX, newY) {
        let r = this.w / 2;
        this.shapeElement.setAttributeNS(null, 'cx', newX + r);
        this.shapeElement.setAttributeNS(null, 'cy', newY + r);
        this.iconElement.setAttributeNS(null, 'x', newX + (this.w - this.iconSize) / 2);
        this.iconElement.setAttributeNS(null, 'y', newY);
        this.captionElement.setAttributeNS(null, 'x', newX);
        this.captionElement.setAttributeNS(null, 'y', newY);
        this.commentElement.setAttributeNS(null, 'x', newX);
        this.commentElement.setAttributeNS(null, 'y', newY + 15);
        this.anchors.movePosition(relX, relY);
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class CircleBlock2 extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, color) {
        super(diagram, id, icon, metaName, caption, comment, x, y,
            BLOCK_CIRCLE_RADIUS * 2, BLOCK_CIRCLE_RADIUS * 2, userData, 'hd-block2');
        const svg = diagram.svg;
        this.shape = CIRCLE_BLOCK_SHAPE;
        this.w = this.w + 10;
        this.h = this.h + 10;
        let iconSize = 22;
        let iconAreaWidth = 30;
        let fontSize = BLOCK_FONT_SIZE;
        let lineHeight = 16;
        let radius = Math.min(this.w, this.h) * 0.1;
        this.commentShapeElement = null;
        this.commentForeignElement = null;
        this.commentArea = null;
        this.sizeModifiable = true;

        this.shapeElement = __makeSvgElement('rect', {
            'data-id': this.id,
            rx: '30px',
            width: this.w,
            height: this.h,
        }, [this.classPrefix, 'draggable']);

        this.rootElement = __makeSvgElement('foreignObject', {
            width: this.w,
            height: this.h,
            style: 'position: relative; pointer-events: none;'
        });

        let contentArea = document.createElement('div');
        contentArea.className = `svg-text ${this.classPrefix + '-contentarea'}`;
        contentArea.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 5px;
        `;

        this.iconArea = document.createElement('div');
        this.iconArea.className = `svg-text ${this.classPrefix + '-iconarea'}`;
        this.iconArea.style.cssText = `
            width: ${iconAreaWidth}px;
            height: 40%;
            margin: 3px;
            border-radius: ${radius}px;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
        `;
        let textArea = document.createElement('div');
        textArea.className = `svg-text ${this.classPrefix + '-textarea'}`;
        textArea.style.cssText = `
            height: 60%;
            display: flex;
            flex-direction: column;
            align-items: center;
            line-height: ${lineHeight}px;
            pointer-events: none;
        `;

        contentArea.appendChild(this.iconArea);
        contentArea.appendChild(textArea);

        let iconElement = document.createElement('img');
        iconElement.src = icon;
        iconElement.style.cssText = `
            height: ${iconSize}px;
            width: ${iconSize}px;
            display: flex;
            vertical-align: middle;
            pointer-events: none;`;

        this.captionElement = document.createElement('span');
        this.captionElement.className = 'svg-text';
        this.captionElement.contentEditable = false;
        this.captionElement.style.cssText = `
            font-size: ${fontSize}px;
            display: inline-block;
            text-align: center;
            `;
        this.captionElement.innerHTML = caption;
        this.shapeElement.style.fill = color.bgColor;
        this.iconArea.style.backgroundColor = color.iconColor;

        this.commentElement = document.createElement('span');
        this.commentElement.className = 'svg-text';
        this.commentElement.contentEditable = false;
        this.commentElement.style.cssText = `font-size: ${fontSize}px; color: #777;`;
        this.commentElement.innerHTML = comment;

        this.iconArea.appendChild(iconElement);
        textArea.appendChild(this.captionElement);

        this.rootElement.appendChild(contentArea);
        svg.appendChild(this.shapeElement);
        svg.appendChild(this.rootElement);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, L_POSITION, x, y + (this.h / 2));
        this.anchors.add(this, R_POSITION, x + this.w, y + (this.h / 2));
        this.anchors.add(this, T_POSITION, x + (this.w / 2), y);
        this.anchors.add(this, B_POSITION, x + (this.w / 2), y + this.h);

        this.shapeElement.addEventListener('mouseover', e => this._mouseover(e));
        this.shapeElement.addEventListener('mouseout', e => this._mouseout(e));

        this.initialize();
    }

    movePosition(relX, relY, newX, newY, initial) {
        this.shapeElement.setAttributeNS(null, 'x', newX);
        this.shapeElement.setAttributeNS(null, 'y', newY);
        this.rootElement.setAttributeNS(null, 'x', newX);
        this.rootElement.setAttributeNS(null, 'y', newY);
        if (this.commentShapeElement) {
            this.svg.removeChild(this.commentShapeElement);
            this.svg.removeChild(this.commentForeignElement);
            this.commentShapeElement = null;
            this.commentForeignElement = null;
        }

        this.anchors.movePosition(relX, relY);

        if (!initial) {
            this.diagram.drawHelperLine(newX, newY, this.w, this.h, this.id);
        }
    }

    _mouseover(e) {
        let LEFT_MARGIN = 10;
        if (this.comment.length > 0 && e.buttons === MOUSE_BUTTON_NONE) {
            this.commentShapeElement = __makeSvgElement('rect', {
                width: this.w,
                height: this.h - 50,
                x: this.x - 40,
                y: this.y - 40,
                rx: '5px',
                visibility: 'hidden',
            });

            this.commentForeignElement = __makeSvgElement('foreignObject', {
                width: this.w,
                height: this.h - 50,
                x: this.x - 40,
                y: this.y - 40,
                style: 'pointer-events: none;',
                visibility: 'hidden',
            });

            this.commentArea = document.createElement('div');
            this.commentArea.className = `svg-text ${this.classPrefix + '-textarea'}`;
            this.commentArea.style.cssText = `
                line-height: ${this.h - 50}px;
                pointer-events: none;
                text-align: center;
                color: white;
                display: inline-block;
                padding-left: ${LEFT_MARGIN / 2}px;
                font-size: ${this.fontSize}px;
                white-space: nowrap;
            `;
            this.commentArea.innerHTML = this.comment;

            this.commentShapeElement.appendChild(this.commentForeignElement);
            this.commentForeignElement.appendChild(this.commentArea);
            this.commentForeignElement.style.visibility = 'visible';
            this.commentShapeElement.style.visibility = 'visible';

            this.svg.appendChild(this.commentShapeElement);
            this.svg.appendChild(this.commentForeignElement);

            const newWidth = this.commentArea.getBoundingClientRect().width + LEFT_MARGIN;
            this.commentShapeElement.setAttribute('width', newWidth);
            this.commentForeignElement.setAttribute('width', newWidth);
            this.commentShapeElement.setAttribute('x', this.x - (newWidth / 2) + (this.w / 2));
            this.commentForeignElement.setAttribute('x', this.x - (newWidth / 2) + (this.w / 2));
        }
    }

    _mouseout(e) {
        if (this.commentShapeElement) {
            this.svg.removeChild(this.commentShapeElement);
            this.svg.removeChild(this.commentForeignElement);
            this.commentShapeElement = null;
            this.commentForeignElement = null;
        }
    }

    /**
     * @param {Number} w Relative width value
     * @param {Number} h Relative width value
     */
    alignRelativeSize(w, h) {
        if (this.diagram.isLocked()) {
            return false;
        }

        if (this.sizeModifiable && (w !== 0 || h !== 0)) {
            let _w = this.w;
            let _h = this.h;
            this.w += w;
            this.h += h;
            if (this.w < 80) {
                this.w = 80;
            }
            if (this.h < 80) {
                this.h = 80;
            }

            w = this.w - _w;
            h = this.h - _h;

            this.shapeElement.setAttributeNS(null, 'width', this.w);
            this.shapeElement.setAttributeNS(null, 'height', this.h);
            this.rootElement.setAttributeNS(null, 'width', this.w);
            this.rootElement.setAttributeNS(null, 'height', this.h);

            this.anchors.get(L_POSITION).movePosition(this.x, this.y + (this.h / 2), false, this.shape);
            this.anchors.get(R_POSITION).movePosition(this.x + this.w, this.y + (this.h / 2), false, this.shape);
            this.anchors.get(T_POSITION).movePosition(this.x + (this.w / 2), this.y, false, this.shape);
            this.anchors.get(B_POSITION).movePosition(this.x + (this.w / 2), this.y + this.h, false, this.shape);

            this.links.forEach((link) => {
                if (this.id === link.blockOrigin.id) {
                    if (w !== 0) {
                        if (link.posOrigin === R_POSITION) {
                            // TODO : lineType이 Normal일 때만 adjustControlPoints를 호출해야하는지에 대한 여부
                            link.adjustControlPoints(w, 0);
                        } else if (link.posOrigin === T_POSITION || link.posOrigin === B_POSITION) {
                            link.adjustControlPoints(w / 2, 0);
                        }
                    }
                    if (h !== 0) {
                        if (link.posOrigin === B_POSITION) {
                            link.adjustControlPoints(0, h);
                        } else if (link.posOrigin === L_POSITION || link.posOrigin === R_POSITION) {
                            link.adjustControlPoints(0, h / 2);
                        }
                    }
                }
                if (this.id === link.blockDest.id) {
                    if (w !== 0) {
                        if (link.posDest === R_POSITION) {
                            link.adjustControlPoints2(w, 0);
                        } else if ((link.posDest === T_POSITION || link.posDest === B_POSITION)) {
                            link.adjustControlPoints2(w / 2, 0);
                        }
                    }
                    if (h !== 0) {
                        if (link.posDest === B_POSITION) {
                            link.adjustControlPoints2(0, h);
                        } else if ((link.posDest === L_POSITION || link.posDest === R_POSITION)) {
                            link.adjustControlPoints2(0, h / 2);
                        }
                    }
                }
                link.adjustPoints();
            });
            return true;
        }
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class DiamondBlock extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData) {
        super(diagram, id, icon, metaName, caption, comment, x, y,
            BLOCK_DIAMOND_DEFAULT_RADIUS * 2, BLOCK_DIAMOND_DEFAULT_RADIUS * 2, userData, 'hd-block');

        const svg = diagram.svg;
        this.shape = DIAMOND_BLOCK_SHAPE;
        this.radius = this.w / 2;
        this.iconSize = this.radius * 0.8;
        let xo = x + this.radius;
        let yo = y + this.radius;
        let pp = [`${x} ${yo}`, `${xo} ${y}`, `${xo + this.radius} ${yo}`, `${xo} ${yo + this.radius}`];

        this.shapeElement = __makeSvgElement('polygon', {
            'data-id': this.id,
        }, [this.classPrefix, 'draggable']);

        this.iconElement = __makeSvgElement('image', {
            href: icon,
            width: this.iconSize,
            height: this.iconSize,
            style: 'pointer-events: none',
        });

        this.captionElement = __makeSvgTextElement(
            this.w,
            this.h,
            BLOCK_FONT_SIZE,
            caption);

        this.commentElement = __makeSvgTextElement(
            this.w,
            this.h,
            BLOCK_FONT_SIZE,
            comment);

        svg.appendChild(this.shapeElement);
        svg.appendChild(this.iconElement);
        svg.appendChild(this.captionElement);
        svg.appendChild(this.commentElement);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, L_POSITION, x, y + (this.h / 2));
        this.anchors.add(this, R_POSITION, x + this.w, y + (this.h / 2));
        this.anchors.add(this, T_POSITION, x + (this.w / 2), y);
        this.anchors.add(this, B_POSITION, x + (this.w / 2), y + this.h);

        this.initialize();
    }

    movePosition(relX, relY, newX, newY) {
        let xo = newX + this.radius;
        let yo = newY + this.radius;
        let pp = [`${newX} ${yo}`, `${xo} ${newY}`, `${xo + this.radius} ${yo}`, `${xo} ${yo + this.radius}`];
        this.shapeElement.setAttributeNS(null, 'points', pp.join(','));
        this.iconElement.setAttributeNS(null, 'x', newX + (this.w - this.iconSize) / 2);
        this.iconElement.setAttributeNS(null, 'y', newY);
        this.captionElement.setAttributeNS(null, 'x', newX);
        this.captionElement.setAttributeNS(null, 'y', newY);
        this.commentElement.setAttributeNS(null, 'x', newX);
        this.commentElement.setAttributeNS(null, 'y', newY + 15);
        this.anchors.movePosition(relX, relY);
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class DiamondBlock2 extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, color) {
        super(diagram, id, icon, metaName, caption, comment, x, y,
            BLOCK_DIAMOND_DEFAULT_RADIUS * 2, BLOCK_DIAMOND_DEFAULT_RADIUS * 2, userData, 'hd-block2');

        const svg = diagram.svg;
        this.shape = 'Diamond';
        let iconSize = 22;
        let iconAreaWidth = 35;
        let fontSize = BLOCK_FONT_SIZE;
        let lineHeight = 16;
        this.radius = this.w / 2;
        let xo = x + this.radius;
        let yo = y + this.radius;
        let pp = [`${x} ${yo}`, `${xo} ${y}`, `${xo + this.radius} ${yo}`, `${xo} ${yo + this.radius}`];
        this.commentShapeElement = null;
        this.commentForeignElement = null;
        this.commentArea = null;

        this.shapeElement = __makeSvgElement('polygon', {
            'data-id': this.id,
            width: this.w,
            height: this.h,
            points: pp,
        }, [this.classPrefix, 'draggable']);

        this.rootElement = __makeSvgElement('foreignObject', {
            width: this.w,
            height: this.h,
            style: 'position: relative; pointer-events: none;'
        });

        let contentArea = document.createElement('div');
        contentArea.className = `svg-text ${this.classPrefix + '-contentarea'}`;
        contentArea.style.cssText = `
            width: ${this.w}px;
            height: ${this.h}px;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 5px;
        `;

        this.iconArea = document.createElement('div');
        this.iconArea.className = `svg-text ${this.classPrefix + '-iconarea'}`;
        this.iconArea.style.cssText = `
            width: ${iconAreaWidth}px;
            height: 30%;
            margin-top: 10px;
            border-radius: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
        `;
        let textArea = document.createElement('div');
        textArea.className = `svg-text ${this.classPrefix + '-textarea'}`;
        textArea.style.cssText = `
            width: ${this.w}px;
            height: 40%;
            display: flex;
            justify-content: center;
            flex-direction: column;
            align-items: center;
            text-align: center;
            line-height: ${lineHeight}px;
            pointer-events: none;
        `;

        contentArea.appendChild(this.iconArea);
        contentArea.appendChild(textArea);

        let iconElement = document.createElement('img');
        iconElement.src = icon;
        iconElement.style.cssText = `
            height: ${iconSize}px;
            width: ${iconSize}px;
            display: flex;
            vertical-align: middle;
            pointer-events: none;`;

        this.captionElement = document.createElement('span');
        this.captionElement.className = 'svg-text';
        this.captionElement.contentEditable = false;
        this.captionElement.style.cssText = `
            font-size: ${fontSize}px;
            display: inline-block;
            text-align: center;
            width: ${this.w}px;
            `;
        this.captionElement.innerHTML = caption;
        this.shapeElement.style.fill = color.bgColor;
        this.iconArea.style.backgroundColor = color.iconColor;

        this.commentElement = document.createElement('span');
        this.commentElement.className = 'svg-text';
        this.commentElement.contentEditable = false;
        this.commentElement.style.cssText = `font-size: ${fontSize}px; color: #777;`;
        this.commentElement.innerHTML = comment;

        this.iconArea.appendChild(iconElement);
        textArea.appendChild(this.captionElement);

        this.rootElement.appendChild(contentArea);
        svg.appendChild(this.shapeElement);
        svg.appendChild(this.rootElement);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, L_POSITION, x, y + this.radius);
        this.anchors.add(this, R_POSITION, x + (this.radius * 2), y + this.radius);
        this.anchors.add(this, T_POSITION, x + this.radius, y);
        this.anchors.add(this, B_POSITION, x + this.radius, y + (this.radius * 2));

        this.shapeElement.addEventListener('mouseover', e => this._mouseover(e));
        this.shapeElement.addEventListener('mouseout', e => this._mouseout(e));

        this.initialize();
    }

    movePosition(relX, relY, newX, newY, initial) {
        let xo = newX + this.radius;
        let yo = newY + this.radius;
        let pp = [`${newX} ${yo}`, `${xo} ${newY}`, `${xo + this.radius} ${yo}`, `${xo} ${yo + this.radius}`];
        this.shapeElement.setAttributeNS(null, 'points', pp.join(','));
        this.shapeElement.setAttributeNS(null, 'x', newX);
        this.shapeElement.setAttributeNS(null, 'y', newY);
        this.rootElement.setAttributeNS(null, 'x', newX);
        this.rootElement.setAttributeNS(null, 'y', newY);
        if (this.commentShapeElement) {
            this.svg.removeChild(this.commentShapeElement);
            this.svg.removeChild(this.commentForeignElement);
            this.commentShapeElement = null;
            this.commentForeignElement = null;
        }

        this.anchors.movePosition(relX, relY);

        if (!initial) {
            this.diagram.drawHelperLine(newX, newY, this.w, this.h, this.id);
        }
    }

    _mouseover(e) {
        let LEFT_MARGIN = 10;
        if (this.comment.length > 0 && e.buttons === MOUSE_BUTTON_NONE) {
            this.commentShapeElement = __makeSvgElement('rect', {
                width: this.w,
                height: this.h - 70,
                x: this.x,
                y: this.y - 40,
                rx: '5px',
                visibility: 'hidden',
            });

            this.commentForeignElement = __makeSvgElement('foreignObject', {
                width: this.w,
                height: this.h - 70,
                x: this.x,
                y: this.y - 40,
                style: 'pointer-events: none;',
                visibility: 'hidden',
            });

            this.commentArea = document.createElement('div');
            this.commentArea.className = `svg-text ${this.classPrefix + '-textarea'}`;
            this.commentArea.style.cssText = `
                line-height: ${this.h - 70}px;
                pointer-events: none;
                text-align: center;
                color: white;
                display:inline-block;
                padding-left: ${LEFT_MARGIN / 2}px;
                font-size: ${this.fontSize}px;
                white-space: nowrap;
            `;
            this.commentArea.innerHTML = this.comment;

            this.commentShapeElement.appendChild(this.commentForeignElement);
            this.commentForeignElement.appendChild(this.commentArea);
            this.commentForeignElement.style.visibility = 'visible';
            this.commentShapeElement.style.visibility = 'visible';

            this.svg.appendChild(this.commentShapeElement);
            this.svg.appendChild(this.commentForeignElement);

            const newWidth = this.commentArea.getBoundingClientRect().width + LEFT_MARGIN;
            this.commentShapeElement.setAttribute('width', newWidth);
            this.commentForeignElement.setAttribute('width', newWidth);
            this.commentShapeElement.setAttribute('x', parseFloat(this.x) - (newWidth / 2) + (this.w / 2));
            this.commentForeignElement.setAttribute('x', parseFloat(this.x) - (newWidth / 2) + (this.w / 2));
        }
    }

    _mouseout(e) {
        if (this.commentShapeElement) {
            this.svg.removeChild(this.commentShapeElement);
            this.svg.removeChild(this.commentForeignElement);
            this.commentShapeElement = null;
            this.commentForeignElement = null;
        }
    }

    /**
     * @param {Number} w Relative width value
     * @param {Number} h Relative width value
     */
    alignRelativeSize(w, h) {
        return false;
    }
}

/**
 * @example
 * @param {Diagram} diagram diagram
 * @param {string} id block id
 * @param {string} icon block icon
 * @param {string} caption block caption
 * @param {string} comment block comment
 * @param {number} x block x position
 * @param {number} y block y position
 * @returns {object} block object
 */
class CustomBlock extends Block {
    constructor(diagram, id, icon, metaName, caption, comment, x, y, w, h, userData, event, color) {
        super(diagram, id, icon, metaName, caption, comment, x, y,
            (w < BLOCK_RECT_DEFAULT_WIDTH ? BLOCK_RECT_DEFAULT_WIDTH : w), (h < BLOCK_RECT_DEFAULT_HEIGHT ? BLOCK_RECT_DEFAULT_HEIGHT : h), userData, 'hd-block2');
        this.w = parseFloat(this.w);
        this.h = parseFloat(this.h);

        const svg = diagram.svg;
        this.shape = 'Rectangle';
        this.iconOffset = this.w * 0.05;
        this.iconSize = Math.min(20, Math.min(this.w, this.h) - (this.iconOffset * 2));
        this.initArray = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'defaults', 'ok', 'error', 'default'];
        this.eventElementArray = []; // addAction들의 rect요소를 저장하는 배열
        this.detailType = CUSTOM_BLOCK;
        this.sizeModifiable = true;

        let radius = 5;
        let iconAreaWidth = 22;
        let iconSize = 22;

        this.shapeElement = __makeSvgElement('rect', {
            'data-id': this.id,
            'data-type': 'custom-block',
            rx: 2,
            width: this.w,
            height: this.h
        }, ['hd-block2', 'draggable']);
        this.accumulatedHeight = parseFloat(this.shapeElement.getAttribute('height'));

        this.rootElement = __makeSvgElement('foreignObject', {
            width: this.w,
            height: this.h,
            style: `
            position: relative;
            pointer-events: none;
            user-select: none;
            `
        });

        this.headerDivContainer = document.createElement('div');
        this.headerDivContainer.style.cssText = `
            width: ${this.w}px;
            display: flex;
            flex-direction: row;
            align-items: center;
        `;

        this.iconArea = document.createElement('div');
        this.iconArea.className = `svg-text ${this.classPrefix + '-iconarea'}`;
        this.iconArea.style.cssText = `
            width: ${iconAreaWidth}px;
            height: calc(100% - 7px);
            margin: 4px;
            border-radius: ${radius}px;
            display: flex;
            justify-content: center;
            align-items: center;
            // pointer-events: none;
            background-color: #ababab;
        `;

        let iconElement = document.createElement('img');
        iconElement.src = icon;
        iconElement.style.cssText = `
            height: ${iconSize}px;
            width: ${iconSize}px;
            display: table-cell;
            vertical-align: middle;
            pointer-events: none;
        `;

        this.captionElement = document.createElement('div');
        this.captionElement.className = 'svg-text';
        // this.captionElement.className = 'block-caption';
        this.captionElement.contentEditable = false;
        this.captionElement.style.cssText = `
            font-size: 13px
            pointer-events: none;
        `;
        this.captionElement.innerHTML = caption;

        this.blockMenu = __makeSvgElement('rect', {
            'data-id': this.id,
            class: 'hover-resize',
            rx: radius,
            width: CUSTOM_BLOCK_MENU_WIDTH,
            height: CUSTOM_BLOCK_MENU_HEIGHT,
            fill: 'whitesmoke',
            stroke: '#888888',
            'stroke-width': 1,
        }, ['draggable']);

        this.blockMenuArea = __makeSvgElement('foreignObject', {
            width: CUSTOM_BLOCK_MENU_WIDTH,
            height: CUSTOM_BLOCK_MENU_HEIGHT,
            style: `
            position: relative;
            user-select: none;
            display: flex;
            `
        });

        let blockMenuContainer = document.createElement('div');
        blockMenuContainer.style.cssText = `
            display: flex;
        `;

        let addEventArea = document.createElement('div');
        addEventArea.dataset.icon = BLOCK_MENU_ICON;
        addEventArea.dataset.type = ADD_CUSTOM_EVENT;
        addEventArea.dataset.id = this.id;
        addEventArea.style.cssText = `
            width: ${iconAreaWidth}px;
            height: 25px;
            margin: 2.5px;
            border-radius: ${radius}px;
            background-color: #ababab;
        `;

        let addIconElement = document.createElement('img');
        addIconElement.src = '/icons/plus2.svg';
        addIconElement.dataset.id = this.id;
        addIconElement.style.cssText = `
            height: ${iconSize}px;
            width: ${iconSize}px;
            display: table-cell;
            vertical-align: middle;
            pointer-events: none;
        `;

        let palleteArea = document.createElement('div');
        palleteArea.dataset.icon = BLOCK_MENU_ICON;
        // palleteArea.dataset.type = 'palleteEvent';
        palleteArea.dataset.id = this.id;
        palleteArea.style.cssText = `
            width: ${iconAreaWidth}px;
            height: 25px;
            margin: 2.5px;
            border-radius: ${radius}px;
            background-color: #ababab;
        `;

        let palleteIconElement = document.createElement('img');
        palleteIconElement.src = '/icons/pallete.svg';
        palleteIconElement.dataset.id = this.id;
        palleteIconElement.style.cssText = `
            height: ${iconSize}px;
            width: ${iconSize}px;
            display: table-cell;
            vertical-align: middle;
            pointer-events: none;
        `;
        this.shapeElement.style.fill = color.bgColor;
        this.iconArea.style.backgroundColor = color.iconColor;

        // 블록메뉴 확대 및 축소
        this.blockMenuArea.addEventListener('mouseover', (e) => this.expandBlockMenu(e));
        this.blockMenuArea.addEventListener('mouseout', (e) => this.shrinkBlockMenu(e));

        this.iconArea.appendChild(iconElement);
        this.headerDivContainer.appendChild(this.iconArea);
        this.headerDivContainer.appendChild(this.captionElement);
        this.rootElement.appendChild(this.headerDivContainer);
        addEventArea.appendChild(addIconElement);
        palleteArea.appendChild(palleteIconElement);
        blockMenuContainer.appendChild(addEventArea);
        blockMenuContainer.appendChild(palleteArea);

        this.blockMenuArea.appendChild(blockMenuContainer);

        svg.appendChild(this.shapeElement);
        svg.appendChild(this.rootElement);
        svg.appendChild(this.blockMenu);
        svg.appendChild(this.blockMenuArea);

        this.anchors = new AnchorGroup(diagram);

        this.anchors.add(this, L_POSITION, x, y + CUSTOM_BLOCK_MENU_HEIGHT / 2);
        this.anchors.add(this, R_POSITION, x, y + CUSTOM_BLOCK_MENU_HEIGHT / 2);
        this.anchors.add(this, T_POSITION, x, y + CUSTOM_BLOCK_MENU_HEIGHT / 2);
        this.anchors.add(this, B_POSITION, x, y + CUSTOM_BLOCK_MENU_HEIGHT / 2);

        this._hideBlockMenu();
        this.initialize();
        if (event && event.length > 0) {
            this.eventDeserialize(event);
        }
    }

    contextMenuClick(actionItem) {
        const command = actionItem.dataset.command;
        this.initArray = this.initArray.filter((value) => value !== command);
        const customEventsHeight = this.eventElementArray.length * CUSTOM_EVENT_HEIGHT;
        // 생성된 요소들을 배열에 추가
        this.actionElement = new CustomEventBlock(this.diagram, this.id, command, this, CUSTOM_EVENT_BLOCK, this.x, this.y + this.h + customEventsHeight, this.w, CUSTOM_EVENT_HEIGHT);
        this.eventElementArray.push(this.actionElement);
        this.accumulatedHeight += CUSTOM_EVENT_HEIGHT;
        this.diagram.contextMenu = false;
        this.diagram.dialog.remove();
        const actionData = {
            block: this,
            newEventElement: this.actionElement,
        };
        this.diagram.actionManager.append(ActionManager.CUSTOM_EVENT_ADDED, actionData);
    }

    _hideBlockMenu() {
        this.blockMenu.style.visibility = 'hidden';
        this.blockMenuArea.style.visibility = 'hidden';
    }

    expandBlockMenu(e) {
        const dataIcon = e.target.getAttributeNS(null, 'data-icon');
        if (dataIcon === BLOCK_MENU_ICON) {
            e.target.style.transition = 'width 0.3s ease, height 0.3s ease, x 0.3s ease, y 0.3s ease';
            e.target.style.width = '32px';
            e.target.style.height = '35px';
            e.target.style.margin = '2.5px';
            e.target.firstChild.style.height = '32px';
            e.target.firstChild.style.width = '32px';
            this.blockMenu.setAttribute('width', CUSTOM_BLOCK_MENU_WIDTH + 20);
            this.blockMenu.setAttribute('height', CUSTOM_BLOCK_MENU_HEIGHT + (20 / 2));
            this.blockMenuArea.setAttribute('width', CUSTOM_BLOCK_MENU_WIDTH + 20);
            this.blockMenuArea.setAttribute('height', CUSTOM_BLOCK_MENU_HEIGHT + (20 / 2));
        }
    }

    shrinkBlockMenu(e) {
        const dataIcon = e.target.getAttributeNS(null, 'data-icon');
        if (dataIcon === BLOCK_MENU_ICON) {
            this.blockMenu.setAttribute('width', CUSTOM_BLOCK_MENU_WIDTH);
            this.blockMenu.setAttribute('height', CUSTOM_BLOCK_MENU_HEIGHT);
            this.blockMenuArea.setAttribute('width', CUSTOM_BLOCK_MENU_WIDTH);
            this.blockMenuArea.setAttribute('height', CUSTOM_BLOCK_MENU_HEIGHT);
            e.target.style.width = '22px';
            e.target.style.height = '25px';
            e.target.style.transform = 'translateY(0)'; // 원래 위치로 복구
            e.target.firstChild.style.height = '22px';
            e.target.firstChild.style.width = '22px';
            this.blockMenu.style.transition = 'width 0.3s ease, height 0.3s ease, x 0.3s ease, y 0.3s ease';
            e.target.style.transition = 'width 0.3s ease, height 0.3s ease, x 0.3s ease, y 0.3s ease';
        }
    }

    movePosition(relX, relY, newX, newY) {
        this.blockMenu.style.transition = 'none';

        this.rootElement.setAttributeNS(null, 'x', parseFloat(newX));
        this.rootElement.setAttributeNS(null, 'y', parseFloat(newY));
        this.blockMenu.setAttributeNS(null, 'x', parseFloat(newX));
        this.blockMenu.setAttributeNS(null, 'y', parseFloat(newY) - MIN_DISTANCE);
        this.blockMenuArea.setAttributeNS(null, 'x', parseFloat(newX));
        this.blockMenuArea.setAttributeNS(null, 'y', parseFloat(newY) - MIN_DISTANCE);
        this.shapeElement.setAttributeNS(null, 'x', parseFloat(newX));
        this.shapeElement.setAttributeNS(null, 'y', parseFloat(newY));
        this.anchors.movePosition(relX, relY);
        this.eventElementArray.forEach((actionElement, index) => {
            actionElement.relocation(newX, newY, relX, relY, index);
        });

        this.diagram.actionManager.append('move-component', { target: this, relX, relY, newX, newY });
    }

    alignRelativeSize(w, h) {
        if (this.diagram.isLocked()) {
            return false;
        }
        if (this.sizeModifiable && (w !== 0 || h !== 0)) {
            let _w = this.w;
            let _h = this.h;
            this.w += w;
            this.h += h;
            const beforeCalcWidth = this.w;
            const beforeCalcHeight = this.h;
            if (this.w < BLOCK_RECT_DEFAULT_WIDTH) {
                this.w = BLOCK_RECT_DEFAULT_WIDTH;
            }
            if (this.h < BLOCK_RECT_DEFAULT_HEIGHT) {
                this.h = BLOCK_RECT_DEFAULT_HEIGHT;
            }
            const customBlockPosY = this.y + this.h;
            // 하위 이벤트들의 크기도 같이 조절
            this.eventElementArray.forEach((event, eventIndex) => {
                event.alignRelativeSize(this.w, _w, this.h, _h, customBlockPosY, eventIndex);
            });
            if (_h !== this.h) {
                this.links.forEach((link) => {
                    link.adjustPoints();
                });
            }

            w = this.w - _w;
            h = this.h - _h;

            this.shapeElement.setAttributeNS(null, 'width', this.w);
            this.shapeElement.setAttributeNS(null, 'height', this.h);
            this.rootElement.setAttributeNS(null, 'width', this.w);
            this.rootElement.setAttributeNS(null, 'height', this.h);

            return true;
        }
    }

    eventDeserialize(event) {
        for (let evt of event) {
            this.actionElement = new CustomEventBlock(this.diagram, this.id, evt, this, CUSTOM_EVENT_BLOCK, this.x, this.y + this.accumulatedHeight * 1, this.w, CUSTOM_EVENT_HEIGHT);
            this.eventElementArray.push(this.actionElement);
            this.accumulatedHeight += parseFloat(CUSTOM_EVENT_HEIGHT);
        }
    }
}

class CustomEventBlock {
    constructor(diagram, id, event, block, type, x, y, w, h) {
        this.diagram = diagram;
        this.svg = diagram.svg;
        this.id = id;
        this.event = event;
        this.block = block;
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.link = null;
        let radius = 2;

        this.shapeElement = __makeSvgElement('rect', {
            id: `addAction-${event}`,
            width: this.w,
            height: CUSTOM_EVENT_HEIGHT,
            rx: radius,
            x: this.x,
            y: this.y,
        }, ['draggable']);

        this.shapeElement.style.cssText = `
            fill: whitesmoke;
            stroke: lightgrey;
            stroke-width: 1;
            filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.5));
            user-select: none;
        `;

        this.addActionArea = __makeSvgElement('foreignObject', {
            id: `addActionArea-${event}`,
            'data-command': event,
            width: this.w,
            height: CUSTOM_EVENT_HEIGHT,
            x: this.x,
            y: this.y,
        });
        this.actionDivContainer = document.createElement('div');
        this.actionDivContainer.dataset.type = CUSTOM_EVENT_BLOCK;
        this.actionDivContainer.dataset.linkId = this.link;
        this.actionDivContainer.style.cssText = `
            display: flex;
            user-select: none;
        `;

        this.iconArea = document.createElement('div');
        this.iconArea.className = 'deleteIconEvent';
        this.iconArea.style.cssText = `
            width: 22px;
            height: calc(100% - 7px);
            margin: 4px;
            border-radius: 5px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            background-color: #ababab;
        `;

        this.actionIcon = document.createElement('img');
        this.actionIcon.src = '/icons/trash.svg';
        this.actionIcon.setAttributeNS(null, 'data-id', `actionIcon-${event}`);
        this.actionIcon.style.cssText = `
            height: 22px;
            width: 22px;
            display: table-cell;
            vertical-align: middle;
        `;

        this.actionTextArea = document.createElement('div');
        this.actionTextArea.style.cssText = `
            width: 100%;
            margin-left: 10px;
            pointer-events: none;
        `;
        this.actionTextArea.innerHTML = event;

        this.iconArea.appendChild(this.actionIcon);
        this.actionDivContainer.appendChild(this.actionTextArea);
        this.actionDivContainer.appendChild(this.iconArea);
        this.addActionArea.appendChild(this.actionDivContainer);

        this.svg.appendChild(this.shapeElement);
        this.svg.appendChild(this.addActionArea);

        this.actionIcon.addEventListener('dblclick', () => {
            this._deleteMenu();
        }, true);

        this.anchors = new AnchorGroup(diagram);
        this.anchors.add(this, this.event, parseFloat(this.x) + parseFloat(this.w), this.y + CUSTOM_EVENT_HEIGHT / 2, 'customEventAnchor');
    }

    relocation(newX, newY, relX, relY, eleIndex) {
        // 모든 추가된 요소들의 위치 업데이트
        const currentShapeHeight = parseFloat(this.block.shapeElement.getAttribute('height'));
        const actionEleNewY = newY + currentShapeHeight + (eleIndex * this.shapeElement.getAttribute('height'));

        this.shapeElement.setAttributeNS(null, 'x', newX);
        this.shapeElement.setAttributeNS(null, 'y', actionEleNewY);
        this.addActionArea.setAttributeNS(null, 'x', newX);
        this.addActionArea.setAttributeNS(null, 'y', actionEleNewY);
        this.anchors.movePosition(relX, relY);
    }

    _deleteMenu() {
        // 선택한 이벤트를 customBlock에서 삭제하는 로직
        const beforeDeletedEvent = Object.assign({}, this);
        this.block.eventElementArray = this.block.eventElementArray
            .map((ele) => {
                if (ele.event === this.event) {
                    return null;
                }
                return ele;
            }).filter(ele => ele !== null);

        this.svg.removeChild(this.shapeElement);
        this.svg.removeChild(this.addActionArea);
        this.anchors.remove();

        if (this.link) {
            if (this.block.shapeElement.getAttribute('class', 'blink')) {
                this.block.shapeElement.classList.remove('blink');
                this.diagram.components.get(this.link).shapeElement.classList.remove('blinkLine');
            }
            this.block.removeLink(this.link);
        }
        this.block.accumulatedHeight -= CUSTOM_EVENT_HEIGHT;
        this._reArrange(this.block.eventElementArray);
        this.block.initArray.push(this.event.trim());

        this.diagram.actionManager.append(ActionManager.CUSTOM_EVENT_REMOVED, beforeDeletedEvent);
    }

    _reArrange(array) {
        const currentShapeHeight = parseFloat(this.block.shapeElement.getAttribute('y'));
        const blocHeight = parseFloat(this.block.shapeElement.getAttribute('height'));
        const eventHeight = this.addActionArea.getAttributeNS(null, 'height');
        array.forEach((ele, index) => {
            let actionEleNewY = currentShapeHeight + blocHeight + (index * this.shapeElement.getAttribute('height'));
            // 중간 위치의 이벤트를 삭제한 후 위로 땡길 때
            if (actionEleNewY !== parseFloat(ele.shapeElement.getAttributeNS(null, 'y'))) {
                ele.anchors.movePosition(0, eventHeight * -1);
                ele.block.links.forEach((link) => {
                    link.adjustPoints();
                });
            }
            ele.shapeElement.setAttributeNS(null, 'y', actionEleNewY);
            ele.addActionArea.setAttributeNS(null, 'y', actionEleNewY);
        });
    }

    alignRelativeSize(width, _w, height, _h, customBlockPosY, eventIndex) {
        this.shapeElement.setAttributeNS(null, 'width', width);
        this.shapeElement.setAttributeNS(null, 'y', customBlockPosY + (eventIndex * CUSTOM_EVENT_HEIGHT));
        this.addActionArea.setAttributeNS(null, 'width', width);
        this.addActionArea.setAttributeNS(null, 'y', customBlockPosY + (eventIndex * CUSTOM_EVENT_HEIGHT));
        // width 축소가 가능할 때
        // anchor위치 수정 및 link가 연결되어있다면 link 재조정
        if (width !== _w && width >= BLOCK_RECT_DEFAULT_WIDTH) {
            this.anchors.movePosition(width - _w, 0);
            if (this.link) {
                const connectedLink = this.diagram.components.get(this.link);
                connectedLink.adjustPoints();
            }
        }
        if (height !== _h) {
            this.anchors.movePosition(0, height - _h);
        }
    }
}

/**
 * @example
 * @param {object} block block object
 * @param {string} position anchor position on block ('T', 'B', 'L', 'R')
 * @param {number} x anchor x position
 * @param {number} y anchor y position
 * @returns {object} svg element
 */
class Link extends UIComponent {
    constructor(diagram, id, caption, blockOrigin, blockDest, posOrigin, posDest, selected, moveX, moveY) {
        super(diagram, L_POSITION, id);
        this.caption = caption;
        this.blockOrigin = blockOrigin;
        this.blockDest = blockDest;
        this.posOrigin = posOrigin;
        this.posDest = posDest;
        this.anchorFrom = blockOrigin.anchors.get(posOrigin);
        this.anchorTo = blockDest.anchors.get(posDest);
        this.lineType = diagram.options.lineType;
        this.hoverTimeout = 0;
        this.moveX = moveX || 0;
        this.moveY = moveY || 0;
        if (diagram !== this.anchorTo.diagram) {
            throw new Error('diagram not matched');
        }

        this.shapeElement = __makeSvgElement('path', {
            'data-id': this.id,
            'marker-end': `url(#${diagram.markerId})`,
            cursor: 'pointer'
        }, ['hd-link']);

        this.textElement = __makeSvgElement('text', {
            'font-size': 15,
            cursor: 'pointer'
        }, ['hd-link-text', 'svg-text']);

        this.shapePointElement = __makeSvgElement('circle', {
            r: 5,
            'data-id': this.id,
            'data-type': 'shapePoint',
            'stroke-width': 1,
            stroke: 'rgb(100, 100, 100)',
            fill: 'rgb(100, 100, 100)',
            display: 'none'
        }, []);

        this.connectPointElement = __makeSvgElement('circle', {
            class: 'movingPoint',
            cx: this.anchorTo.x,
            cy: this.anchorTo.y,
            r: 8, // TODO : Anchor사이즈와 변수 동일하게 처리
            'stroke-width': 1,
            stroke: 'rgb(100, 100, 100)',
            fill: 'rgb(100, 100, 100)',
            opacity: '0.4',
            display: 'none'
        }, []);
        const innerText = document.createTextNode(caption);

        this.svg.appendChild(this.shapeElement);
        this.svg.appendChild(this.shapePointElement);
        this.svg.appendChild(this.connectPointElement);
        if (this.lineType === NORMAL_DIAGRAM_TYPE) {
            this.textElement.appendChild(innerText);
            this.svg.appendChild(this.textElement);
        }
        this.adjustPoints(this.moveX, this.moveY);

        this.connectPointElement.addEventListener('mousedown', e => this._mousedownOnCP(e));
        this.shapeElement.addEventListener('click', e => this._mouseclick(e));
        this.shapeElement.addEventListener('dblclick', e => this._mousedblclick(e));
        if (this.lineType === NORMAL_DIAGRAM_TYPE) {
            this.shapeElement.addEventListener('mouseover', e => this._mouseover(e));
            this.shapeElement.addEventListener('mouseout', e => this._mouseout(e));
            this.textElement.addEventListener('click', e => this._mouseclick(e));
            this.textElement.addEventListener('dblclick', e => this._mousedblclick(e));
            this.textElement.addEventListener('mouseover', e => this._mouseover(e));
            this.textElement.addEventListener('mouseout', e => this._mouseout(e));
        }

        if (blockOrigin.type === CUSTOM_EVENT_BLOCK) {
            blockOrigin.block.links.set(this.id, this);
            blockDest.links.set(this.id, this);
        } else {
            blockOrigin.links.set(this.id, this);
            blockDest.links.set(this.id, this);
        }
        if (diagram.ready) {
            diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, blockOrigin, ModifyEventTypes.LinkAdded);
        }

        if (selected) {
            this.select();
        }
    }

    select() {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        if (!this.selected) {
            this.selected = true;
            this.diagram.appendToSelection(this);
            if (this.lineType !== CUSTOM_DIAGRAM_TYPE) {
                if (this.minDistance !== 0) {
                    this.shapePointElement.style.display = 'block';
                }
            }
            this.connectPointElement.style.display = 'block';
            this.shapeElement.classList.remove('hd-link');
            this.shapeElement.classList.add('hd-link-selected');
            this.textElement.classList.remove('hd-link-text');
            this.textElement.classList.add('hd-link-text-selected');
        }
    }

    unselect() {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        if (this.selected) {
            this.shapePointElement.style.display = 'none';
            this.connectPointElement.style.display = 'none';
            this.shapeElement.classList.remove('hd-link-selected');
            this.shapeElement.classList.add('hd-link');
            this.textElement.classList.remove('hd-link-text-selected');
            this.textElement.classList.add('hd-link-text');
            this.selected = false;
            this.diagram.removeFromSelection(this);
            this._removeAnimatedMarkerToLink();
        }
    }

    remove() {
        try {
            this.svg.removeChild(this.shapeElement);
        } catch (e) {
        }
        try {
            this.svg.removeChild(this.textElement);
        } catch (e) {
        }
        try {
            this.svg.removeChild(this.shapePointElement);
        } catch (e) {
        }
        try {
            this.svg.removeChild(this.connectPointElement);
        } catch (e) {
        }
        if (this.diagram.options.debugMode) {
            try {
                this.svg.removeChild(this.controlPointElement);
            } catch (e) {
            }
            try {
                this.svg.removeChild(this.controlPoint2Element);
            } catch (e) {
            }
            try {
                this.svg.removeChild(this.cpAuxLineElement);
            } catch (e) {
            }
            try {
                this.svg.removeChild(this.cpAuxLineElement2);
            } catch (e) {
            }
        }
        if (this.blockOrigin.type === CUSTOM_EVENT_BLOCK) {
            this.blockOrigin.block.links.delete(this.id);
            this.blockDest.links.delete(this.id);
            this.diagram.components.delete(this.id);
            this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.LinkRemoved);
            return;
        }
        this.blockOrigin.links.delete(this.id);
        this.blockDest.links.delete(this.id);
        this.diagram.components.delete(this.id);
        this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.LinkRemoved);
        this.blockOrigin.shapeElement.classList.remove('connect-block');
        this.blockDest.shapeElement.classList.remove('connect-block');
    }

    _mouseover(e) {
        if (this.selected) {
            this.blockOrigin.shapeElement.classList.add('connect-block');
            this.blockDest.shapeElement.classList.add('connect-block');
        }
        if (!this.diagram.creatingLinkOrigin) {
            this.shapeElement.classList.add('hd-link-thick');
            this.textElement.setAttribute('font-size', '20');
            this.textElement.style.fontWeight = 'bolder';
        }
    }

    _mouseout(e) {
        clearTimeout(this.hoverTimeout);
        this.textElement.setAttribute('font-size', '15');
        this.textElement.style.fontWeight = 'normal';
        this.shapeElement.classList.remove('hd-link-thick');
    }

    _addAnimatedMarkerToLink() {
        // 기존에 존재해있던 효과 삭제
        const existingGroup = this.svg.querySelector('g.animation-group');
        if (existingGroup) {
            existingGroup.remove();
        }
        // 링크 caption을 표시하기 위해 group 객체 생성
        const group = __makeSvgElement('g', {
            class: 'animation-group'
        });
        // 효과를 주는 원
        const animationCircle = __makeSvgElement('circle', {
            r: 15,
            fill: 'blue'
        });
        // 내부 caption 텍스트
        const animationText = __makeSvgElement('text', {
            x: 0,
            y: 2,
            'text-anchor': 'middle',
            'font-size': '8px',
            fill: 'white'
        });
        // 텍스트 content에 caption 입력
        animationText.textContent = this.caption;
        group.appendChild(animationCircle);
        group.appendChild(animationText);

        const animationMotion = __makeSvgElement('animateMotion', {
            repeatCount: 'indefinite',
            dur: '3s'
        });

        const uniquePathId = `motion-path-${this.id}`;
        // shapeElement에 고유한 id속성 생성
        this.shapeElement.setAttribute('id', uniquePathId);
        // animation을 참조하기 위해 href로 연결
        const mpath = __makeSvgElement('mpath', {
            href: `#${uniquePathId}`
        });
        animationMotion.appendChild(mpath);
        // group에 animationMotion 하위로 태그로 넣기
        group.appendChild(animationMotion);
        // Append the group to the SVG
        this.svg.appendChild(group);
    }

    _removeAnimatedMarkerToLink() {
        const animationGroup = this.svg.querySelector('g.animation-group');
        if (animationGroup) {
            animationGroup.remove();
        }
        this.shapeElement.removeAttribute('id');
    }

    /**
     * #makeArcPath
     */
    static _makeArcPath(pta, ptb, ptc, r) {
        // arcs: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
        //       rx: x 축 반지름
        //       ry: y 축 반지름
        //       x-axis-rotation: x 축으로 돌리기 (사용안함)
        //       sweep-flag: 1 이면 시계방향, 0 이면 반시계방향으로 그리기.
        //       large-arc-flag: 더 큰 원을 사용하기.
        // https://www.nan.fyi/svg-paths/arcs
        let { x: ax, y: ay } = pta;
        let { x: bx, y: by } = ptb;
        let { x: cx, y: cy } = ptc;
        let [ptaX, ptaY, ptcX, ptcY, clockwise] = [0, 0, 0, 0, 0];

        if (ax === bx) {
            if (ay < by) {
                ptaX = bx;
                ptaY = by - r;
                if (ptaY < ay) {
                    return null;
                }
                if (bx < cx) { // Down-Right
                    ptcX = bx + r;
                    ptcY = by;
                    if (ptcX > cx) {
                        return null;
                    }
                } else if (bx === cx) {
                    return null; // abc 가 모두 동일한 세로선에 있음.
                } else { // Down-Left
                    ptcX = bx - r;
                    ptcY = by;
                    if (ptcX < cx) {
                        return null;
                    }
                    clockwise = 1;
                }
            } else if (ay === by) {
                return null; // ab 가 동일한 점임
            } else {
                ptaX = bx;
                ptaY = by + r;
                if (ptaY > ay) {
                    return null;
                }
                if (bx < cx) { // Up-Right
                    ptcX = bx + r;
                    ptcY = by;
                    if (cx < ptcX) {
                        return null;
                    }
                    clockwise = 1;
                } else if (bx === cx) {
                    return null; // abc 가 모두 동일한 세로선에 있음.
                } else { // Up-Left
                    ptcX = bx - r;
                    ptcY = by;
                    if (ptcX < cx) {
                        return null;
                    }
                }
            }
        } else if (ax < bx) {
            ptaX = bx - r;
            ptaY = by;
            if (ptaX < ax) {
                return null;
            }
            if (by < cy) { // Right-Down
                ptcX = bx;
                ptcY = by + r;
                if (ptcY < cy) {
                    return null;
                }
                clockwise = 1;
            } else if (by === cy) {
                return null; // abc 가 모두 동일한 가로선에 있음.
            } else { // Right-Up
                ptcX = bx;
                ptcY = by - r;
                if (ptcY < cy) {
                    return null;
                }
            }
        } else {
            ptaX = bx + r;
            ptaY = by;
            if (ptaX > ax) {
                return null;
            }
            if (by < cy) { // Left-Down
                ptcX = bx;
                ptcY = by + r;
                if (ptcY > cy) {
                    return null;
                }
            } else if (by === cy) {
                return null; // abc 가 모두 동일한 가로선에 있음.
            } else { // Left-Up
                ptcX = bx;
                ptcY = by - r;
                if (ptcY < cy) {
                    return null;
                }
                clockwise = 1;
            }
        }
        let arc = `A${r} ${r} 0 0 ${clockwise} ${ptcX} ${ptcY}`;
        return { x: ptaX, y: ptaY, arc };
    }

    static _makeRoundedPath(points) {
        if (points.length < 3) {
            throw new Error('invalid points');
        }
        const r = 10;
        const path = [];
        const useSharp = true;
        let start = points[0];
        let last = points[points.length - 1];

        path.push(`M${start.x} ${start.y}`);
        if (useSharp) {
            for (let n = 1; n < points.length; n++) {
                let pt = points[n];
                path.push(`L${pt.x} ${pt.y}`);
            }
        } else {
            let arcs = [];
            for (let n = 0; n < points.length - 2; n++) {
                let pt0 = points[n];
                let pt1 = points[n + 1];
                let pt2 = points[n + 2];
                let result = Link._makeArcPath(pt0, pt1, pt2, r);
                result = false;
                if (result) {
                    arcs.push([`L${result.x} ${result.y}`, result.arc]);
                } else {
                    arcs.push(null);
                }
            }
            path.push(`L${last[0]} ${last[1]}`);
        }
        return path.join(' ');
    }

    static _calcAdjacentPoint(min, anchor) {
        if (anchor.position === L_POSITION) {
            return { x: anchor.x - min, y: anchor.y };
        } else if (anchor.position === R_POSITION) {
            return { x: anchor.x + min, y: anchor.y };
        } else if (anchor.position === T_POSITION) {
            return { x: anchor.x, y: anchor.y - min };
        } else {
            return { x: anchor.x, y: anchor.y + min };
        }
    }

    _mouseclick(e) {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        if (!this.selected) {
            // Diagram 의 MouseDown, MouseClick 과 처리가 겹칠 수 있기 때문에 주의해야 한다.
            if (!e.shiftKey) {
                this.diagram.clearSelection(this);
            }
            this.blockOrigin.shapeElement.classList.add('connect-block');
            this.blockDest.shapeElement.classList.add('connect-block');
            this.diagram.blinkOriginBlock = this.blockOrigin;
            this.diagram.blinkDestBlock = this.blockDest;
            this._addAnimatedMarkerToLink();
            this.select();
        }
    }

    _mousedblclick(e) {
        if (e.ctrlKey) {
            this.controlPoint = null;
            this.controlPoint2 = null;
            this.adjustPoints();
            return;
        }
        let block = this.blockOrigin;
        let meta = this.diagram.meta;

        // 1) Meta 의 Node 정보에서 Link 에 대한 Description 을 찾는다.
        let nodeDef = meta.nodes[block.metaName];
        let linkDef = nodeDef.links.filter(o => o.name === this.caption)[0];
        let desc = linkDef ? linkDef.description : null;

        // 2) 없다면 Meta 의 Global Descprion 정보에서 찾는다.
        if (!desc) { // undefined or ''
            desc = meta.descriptions.link[this.caption];
        }

        if (desc) {
            alert(desc);
        }
    }

    adjustControlPoints(cpMoveX, cpMoveY) {
        if (this.controlPoint) {
            this.controlPoint.x += cpMoveX;
            this.controlPoint.y += cpMoveY;
        }
    }

    adjustControlPoints2(cpMoveX, cpMoveY) {
        if (this.controlPoint2) {
            this.controlPoint2.x += cpMoveX;
            this.controlPoint2.y += cpMoveY;
        }
    }

    adjustPoints(moveX = 0, moveY = 0) {
        let startX = this.anchorFrom.x;
        let startY = this.anchorFrom.y;
        let endX = this.anchorTo.x;
        let endY = this.anchorTo.y;
        let min = this.lineType === 'B' ? MIN_DISTANCE * 2 : MIN_DISTANCE;
        let distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        let textStartX, textStartY, textEndX, textEndY, points;
        let anchorInfo = { startX, startY, endX, endY };
        if (this.lineType === NORMAL_DIAGRAM_TYPE) {
            let minDistance = (distance < min * 2) ? 0 : MIN_DISTANCE;
            this.minDistance = minDistance;
            // NewLink일 경우
            if (!this.controlPoint || !this.controlPoint2) {
                this.controlPoint = Link._calcAdjacentPoint(DEFAULT_ADJ_DIST, this.anchorFrom);
                this.controlPoint2 = Link._calcAdjacentPoint(DEFAULT_ADJ_DIST, this.anchorTo);
            }

            if (minDistance === 0) {
                // min*2 보다 작다면 너무 짧아서 lineType 에 상관없이 직선을 사용.
                textStartX = startX;
                textStartY = startY;
                textEndX = endX;
                textEndY = endY;
                points = `M${startX} ${startY} L${endX} ${endY}`;
                let textX = textStartX + (textEndX - textStartX) / 2;
                let textY = textStartY + (textEndY - textStartY) / 2;
                this.shapePointElement.setAttribute('cx', textX);
                this.shapePointElement.setAttribute('cy', textY);
                this.connectPointElement.setAttributeNS(null, 'cx', this.anchorTo.x);
                this.connectPointElement.setAttributeNS(null, 'cy', this.anchorTo.y);
                this.shapeElement.setAttribute('d', points);
                this.textElement.setAttribute('x', textX - 10);
                this.textElement.setAttribute('y', textY);
                this.hideDebugElement();
            } else {
                let t = 0.5;
                let result = this.getCurveRoute(anchorInfo, moveX, moveY);
                points = result.points;
                this.shapeElement.setAttribute('d', points);
                this.shapePointElement.setAttribute('cx', result.shapePoint.cx);
                this.shapePointElement.setAttribute('cy', result.shapePoint.cy);
                this.textElement.setAttribute('x', result.shapePoint.cx + 3); // 약간의 공백을 위해 값을 더해줌
                this.textElement.setAttribute('y', result.shapePoint.cy - 3); // 약간의 공백을 위해 값을 더해줌
                this.connectPointElement.setAttributeNS(null, 'cx', this.anchorTo.x);
                this.connectPointElement.setAttributeNS(null, 'cy', this.anchorTo.y);
                if (this.diagram.options.debugMode) {
                    this.controlPointElement.setAttribute('cx', this.controlPoint.x);
                    this.controlPointElement.setAttribute('cy', this.controlPoint.y);
                    this.controlPoint2Element.setAttribute('cx', this.controlPoint2.x);
                    this.controlPoint2Element.setAttribute('cy', this.controlPoint2.y);
                    let auxPoints = `M${startX} ${startY} L${this.controlPoint.x} ${this.controlPoint.y}`;
                    let auxPoints2 = `M${this.controlPoint2.x} ${this.controlPoint2.y} L${endX} ${endY}`;
                    this.cpAuxLineElement.setAttribute('d', auxPoints);
                    this.cpAuxLineElement2.setAttribute('d', auxPoints2);
                    this.showDebugElement();
                }
            }
        } else if (this.lineType === CUSTOM_DIAGRAM_TYPE) {
            points = this.getOptimalCustomRoute(anchorInfo);

            this.shapeElement.setAttribute('d', points);
            this.connectPointElement.setAttributeNS(null, 'cx', this.anchorTo.x);
            this.connectPointElement.setAttributeNS(null, 'cy', this.anchorTo.y);
        } else {
            if (distance < min * 2) {
                // min*2 보다 작다면 너무 짧아서 lineType 에 상관없이 직선을 사용.
                textStartX = startX;
                textStartY = startY;
                textEndX = endX;
                textEndY = endY;
                points = `M${startX} ${startY} L${endX} ${endY}`;
            } else {
                let adj1 = Link._calcAdjacentPoint(min, this.anchorFrom);
                let adj2 = Link._calcAdjacentPoint(min, this.anchorTo);
                if (this.lineType === 'L') {
                    let pt = [
                        { x: startX, y: startY },
                        { x: adj1.x, y: adj1.y },
                        { x: adj2.x, y: adj1.y },
                        { x: adj2.x, y: adj2.y },
                        { x: endX, y: endY }];
                    points = Link._makeRoundedPath(pt);
                } else if (this.lineType === 'B') {
                    points = `M${startX} ${startY} C${adj1.x} ${adj1.y} ${adj2.x} ${adj2.y} ${endX} ${endY}`;
                } else {
                    points = `M${startX} ${startY} L${adj1.x} ${adj1.y} L${adj2.x} ${adj2.y} L${endX} ${endY}`;
                }
                textStartX = adj1.x;
                textStartY = adj1.y;
                textEndX = adj2.x;
                textEndY = adj2.y;
            }
            this.connectPointElement.setAttributeNS(null, 'cx', this.anchorTo.x);
            this.connectPointElement.setAttributeNS(null, 'cy', this.anchorTo.y);
            // 아래의 stroke-linejoin 은 storke 가 두꺼울 때만 의미가 있다.
            // 필요한 Rounded corners 효과는 불가능하다.
            // this.shapeElement.setAttribute("stroke-linejoin", "round");
            this.shapeElement.setAttribute('d', points);
            let textX = textStartX + (textEndX - textStartX) / 2;
            let textY = textStartY + (textEndY - textStartY) / 2;
            this.textElement.setAttribute('x', textX);
            this.textElement.setAttribute('y', textY);
        }
    }

    getOptimalCustomRoute(anchorInfo) {
        let midY = (anchorInfo.endY + anchorInfo.startY) / 2;
        let points = '';
        if (this.anchorTo.block.detailType === CUSTOM_BLOCK) {
            if (anchorInfo.startX > anchorInfo.endX) {
                points = `M${anchorInfo.startX},${anchorInfo.startY} 
                L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.startY} 
                L${MIN_DISTANCE + anchorInfo.startX},${midY} 
                L${anchorInfo.endX - MIN_DISTANCE},${midY} 
                L${anchorInfo.endX - MIN_DISTANCE},${anchorInfo.endY} 
                L${anchorInfo.endX},${anchorInfo.endY}`;
            } else {
                points = `M${anchorInfo.startX},${anchorInfo.startY} 
                L${(anchorInfo.startX + anchorInfo.endX) / 2},${anchorInfo.startY} 
                L${(anchorInfo.startX + anchorInfo.endX) / 2},${anchorInfo.endY} 
                L${anchorInfo.endX},${anchorInfo.endY}`;
            }
        } else if (this.anchorTo.block.detailType !== CUSTOM_BLOCK) {
            if (anchorInfo.startX > anchorInfo.endX) {
                if (this.anchorTo.position === T_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${midY} 
                        L${anchorInfo.endX},${midY} 
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                } else if (this.anchorTo.position === B_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${MIN_DISTANCE + anchorInfo.endY} 
                        L${anchorInfo.endX},${MIN_DISTANCE + anchorInfo.endY} 
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                } else if (this.anchorTo.position === R_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.endY} 
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                } else if (this.anchorTo.position === L_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${midY} 
                        L${anchorInfo.endX - MIN_DISTANCE},${midY} 
                        L${anchorInfo.endX - MIN_DISTANCE},${anchorInfo.endY} 
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                }
            } else {
                if (this.anchorTo.position === T_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${anchorInfo.endX},${anchorInfo.startY} 
                        L${anchorInfo.endX},${anchorInfo.endY} 
                        `;
                } else if (this.anchorTo.position === B_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.startX},${MIN_DISTANCE + anchorInfo.endY} 
                        L${anchorInfo.endX},${MIN_DISTANCE + anchorInfo.endY} 
                        L${anchorInfo.endX},${anchorInfo.endY}
                        `;
                } else if (this.anchorTo.position === R_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.endX},${anchorInfo.startY} 
                        L${MIN_DISTANCE + anchorInfo.endX},${anchorInfo.endY} 
                        L${anchorInfo.endX},${anchorInfo.endY} 
                        `;
                } else if (this.anchorTo.position === L_POSITION) {
                    points = `M${anchorInfo.startX},${anchorInfo.startY} 
                        L${(anchorInfo.startX + anchorInfo.endX) / 2},${anchorInfo.startY} 
                        L${(anchorInfo.startX + anchorInfo.endX) / 2},${anchorInfo.endY} 
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                }
            }
        }
        return points;
    }

    getCurveRoute(anchorInfo, moveX = 0, moveY = 0) {
        moveY = Number(moveY);
        moveX = Number(moveX);
        let midY = (anchorInfo.endY + anchorInfo.startY) / 2;
        let midX = (anchorInfo.endX + anchorInfo.startX) / 2;
        let angleVal = 10;
        let points = '';
        let shapePoint = { cx: null, cy: null };
        // direction: Bottom Up
        if (anchorInfo.startY > anchorInfo.endY) {
            // anchorFrom.x와 anchorTo.x가 일치하는 부분에서 직선으로 연결하도록 처리
            if ((this.anchorTo.x - angleVal * (BLOCK_RECT_DEFAULT_WIDTH / 20) < this.anchorFrom.x && this.anchorTo.x + angleVal * (BLOCK_RECT_DEFAULT_WIDTH / 20) > this.anchorFrom.x) ||
            (this.anchorTo.y - angleVal * (BLOCK_RECT_DEFAULT_HEIGHT / 20) < this.anchorFrom.y && this.anchorTo.y + angleVal * (BLOCK_RECT_DEFAULT_HEIGHT / 20) > this.anchorFrom.y)) {
                points = `M${anchorInfo.startX} ${anchorInfo.startY} L${anchorInfo.endX} ${anchorInfo.endY}`;
                shapePoint.cx = midX;
                shapePoint.cy = midY;
            // startAnchor : Top
            } else if (this.anchorFrom.position === T_POSITION) {
                // direction: Left to Right
                if (this.anchorFrom.x < this.anchorTo.x) {
                    // Bottom Up, Left -> Right, Top -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((midY + moveY) > anchorInfo.startY - angleVal * 2) {
                            // moveY가 anchorInfo.startY를 넘지 않도록 보정
                            moveY = anchorInfo.startY - midY - angleVal * 2;
                        } else if ((midY + moveY - angleVal * 2) < anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY + angleVal * 2;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + angleVal + moveY}
                        Q${anchorInfo.startX} ${midY + moveY}, ${anchorInfo.startX + angleVal} ${midY + moveY}
                        L${anchorInfo.endX - angleVal},${midY + moveY}
                        Q${anchorInfo.endX} ${midY + moveY}, ${anchorInfo.endX} ${midY - angleVal + moveY}
                        L${anchorInfo.endX}, ${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + moveY;
                    // Bottom Up, Left -> Right, Top -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((midY + moveY + angleVal) > anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY - angleVal;
                        } else if ((midY + moveY - angleVal * 2) < anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY + angleVal * 2;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + angleVal + moveY}
                        Q${anchorInfo.startX} ${midY + moveY}, ${anchorInfo.startX + angleVal} ${midY + moveY}
                        L${anchorInfo.endX - angleVal * 3},${midY + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${midY + moveY},${anchorInfo.endX - angleVal * 2} ${midY - angleVal + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + moveY;
                    // Bottom Up, Left -> Right, Top -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        // shapePoint가 최소 endY보다 작아지면
                        if ((anchorInfo.endY - moveY) < (anchorInfo.endY)) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.endY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.endY - angleVal * 2 + moveY},${anchorInfo.startX + angleVal} ${anchorInfo.endY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.endY - angleVal * 2 + moveY;
                    // Bottom Up, Left -> Right, Top -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        if ((midY + moveY) > anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY;
                        //  midY보단 작도로 세팅
                        } else if ((midY + moveY - angleVal * 3) < anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY + angleVal * 3;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + moveY}
                        Q${anchorInfo.startX} ${midY - angleVal + moveY},${anchorInfo.startX + angleVal} ${midY - angleVal + moveY}
                        L${anchorInfo.endX + angleVal},${midY - angleVal + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${midY - angleVal + moveY}, ${anchorInfo.endX + angleVal * 2} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    }
                } else {
                    // Bottom Up, Right -> Left, Top -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((midY + moveY + angleVal * 2) > anchorInfo.startY) {
                            // moveY가 anchorInfo.startY를 넘지 않도록 보정
                            moveY = Math.min(moveY, anchorInfo.startY - midY - angleVal * 2);
                        }
                        if ((midY + moveY - angleVal * 2) < anchorInfo.endY) {
                            moveY = Math.max(moveY, anchorInfo.endY - midY + angleVal * 2);
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + angleVal + moveY} 
                        Q${anchorInfo.startX} ${midY + moveY},${anchorInfo.startX - angleVal} ${midY + moveY} 
                        L${anchorInfo.endX + angleVal},${midY + moveY} 
                        Q${anchorInfo.endX} ${midY + moveY}, ${anchorInfo.endX} ${midY - angleVal + moveY}
                        L${anchorInfo.endX}, ${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + moveY;
                    // Bottom Up, Right -> Left, Top -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        if ((midY + moveY) > anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY;
                        //  midY보단 작도로 세팅
                        } else if ((midY + moveY - angleVal * 3) < anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY + angleVal * 3;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + moveY}
                        Q${anchorInfo.startX} ${midY - angleVal + moveY},${anchorInfo.startX - angleVal} ${midY - angleVal + moveY}
                        L${anchorInfo.endX - angleVal},${midY - angleVal + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${midY - angleVal + moveY}, ${anchorInfo.endX - angleVal * 2} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    // Bottom Up, Right -> Left, Top -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        // shapePoint가 최소 endY보다 작아지면
                        if ((anchorInfo.endY - moveY) < (anchorInfo.endY)) {
                            moveY = 0;
                        }
                        this.moveY = moveY;
                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.endY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.endY - angleVal * 2 + moveY},${anchorInfo.startX - angleVal} ${anchorInfo.endY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.endY - angleVal * 2 + moveY;
                    // Bottom Up, Right -> Left, Top -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if (!((midY + moveY) < anchorInfo.startY)) {
                            // moveY가 anchorInfo.startY를 넘지 않도록 보정
                            moveY = anchorInfo.startY - midY;
                        } else if (((midY - angleVal * 3 + moveY) < anchorInfo.endY)) {
                            moveY = anchorInfo.endY - midY + angleVal * 3;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + moveY}
                        Q${anchorInfo.startX} ${midY - angleVal + moveY},${anchorInfo.startX - angleVal} ${midY - angleVal + moveY}
                        L${anchorInfo.endX + angleVal * 3},${midY - angleVal + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${midY - angleVal + moveY}, ${anchorInfo.endX + angleVal * 2} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    }
                }
            // startAnchor: Left
            } else if (this.anchorFrom.position === L_POSITION) {
                // direction: Left -> Right
                if (this.anchorFrom.x <= this.anchorTo.x) {
                    // Bottom Up, Left -> Right, Left -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        if ((midY + moveY) > (anchorInfo.startY - angleVal * 2)) {
                            moveY = anchorInfo.startY - angleVal * 2 - midY;
                        } else if ((midY + moveY) <= anchorInfo.endY + angleVal * 3) {
                            // shapePoint가 endY를 넘어갈 경우 못넘어가도록 설정
                            moveY = anchorInfo.endY + angleVal * 3 - midY;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal},${anchorInfo.startY} 
                        Q${anchorInfo.startX - angleVal * 2} ${anchorInfo.startY},${anchorInfo.startX - angleVal * 2} ${anchorInfo.startY - angleVal} 
                        L${anchorInfo.startX - angleVal * 2},${midY + moveY}
                        Q${anchorInfo.startX - angleVal * 2} ${midY - angleVal + moveY},${anchorInfo.startX - angleVal} ${midY - angleVal + moveY} 
                        L${anchorInfo.endX - angleVal},${midY - angleVal + moveY} 
                        Q${anchorInfo.endX} ${midY - angleVal + moveY}, ${anchorInfo.endX} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX}, ${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    // Bottom Up, Left -> Right, Left -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX - angleVal * 2 + moveX},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Left -> Right, Left -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX - angleVal * 2 + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Left -> Right, Left -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        if ((anchorInfo.startY - angleVal * 3) < (midY + moveY)) {
                            moveY = anchorInfo.startY - midY - angleVal * 3;
                        } else if ((midY + moveY) <= anchorInfo.endY + angleVal * 3) {
                            // shapePoint가 endY를 넘어갈 경우 못넘어가도록 설정
                            moveY = anchorInfo.endY + angleVal * 3 - midY;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX - angleVal * 2},${midY + moveY}
                        Q${anchorInfo.startX - angleVal * 2} ${midY - angleVal + moveY},${anchorInfo.startX - angleVal} ${midY - angleVal + moveY}
                        L${anchorInfo.endX + angleVal},${midY - angleVal + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${midY - angleVal + moveY}, ${anchorInfo.endX + angleVal * 2} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    }
                // direction: Right -> Left
                } else {
                    // Bottom Up, Right -> Left, Left -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        if ((midY + moveY) > (anchorInfo.startY - angleVal * 2)) {
                            moveY = anchorInfo.startY - angleVal * 2 - midY;
                        } else if ((midY + moveY) <= anchorInfo.endY + angleVal * 3) {
                            // shapePoint가 endY를 넘어갈 경우 못넘어가도록 설정
                            moveY = anchorInfo.endY + angleVal * 3 - midY;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX - angleVal},${midY + angleVal + moveY}
                        Q${anchorInfo.startX - angleVal} ${midY + moveY}, ${anchorInfo.startX - angleVal * 2} ${midY + moveY}
                        L${anchorInfo.endX + angleVal},${midY + moveY}
                        Q${anchorInfo.endX} ${midY + moveY}, ${anchorInfo.endX} ${midY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + moveY;
                    // Bottom Up, Right -> Left, Left -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.endX + moveX) > anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.endX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.endX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.endX - angleVal * 2 + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.endX - angleVal * 2 + moveX},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX - angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.endX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Right -> Left, Left -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX + angleVal) {
                            moveX = 0;
                        } else if ((midX + moveX) > anchorInfo.startX) {
                            moveX = anchorInfo.startX - midX + angleVal;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${midX - angleVal + moveX},${anchorInfo.startY}
                        Q${midX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${midX - angleVal * 2 + moveX} ${anchorInfo.startY - angleVal}
                        L${midX - angleVal * 2 + moveX},${anchorInfo.endY - angleVal}
                        Q${midX - angleVal * 2 + moveX} ${anchorInfo.endY - angleVal * 2}, ${midX - angleVal * 3 + moveX} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Right -> Left, Left -> Top
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((midX + moveX) < anchorInfo.endX + angleVal * 3) {
                            moveX = anchorInfo.endX - midX + angleVal * 3;
                        } else if ((midX + moveX) > anchorInfo.startX - angleVal) {
                            moveX = anchorInfo.startX - midX - angleVal;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${midX + moveX},${anchorInfo.startY}
                        Q${midX - angleVal + moveX} ${anchorInfo.startY}, ${midX - angleVal + moveX} ${anchorInfo.startY - angleVal}
                        L${midX - angleVal + moveX},${anchorInfo.endY + angleVal}
                        Q${midX - angleVal + moveX} ${anchorInfo.endY}, ${midX - angleVal * 2 + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX - angleVal + moveX;
                        shapePoint.cy = midY;
                    }
                }
            // Bottom Up, Left -> Right, Right -> Bottom
            } else if (this.anchorFrom.position === R_POSITION) {
                if (this.anchorFrom.x <= this.anchorTo.x) {
                    // Bottom Up, Left -> Right, Right -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if (((midY + moveY) > anchorInfo.startY - angleVal * 2)) {
                            // moveY가 anchorInfo.startY를 넘지 않도록 보정
                            moveY = anchorInfo.startY - midY - angleVal * 2;
                        }
                        if ((midY + moveY) < anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY + angleVal * 2;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX + angleVal * 2},${midY + angleVal + moveY}
                        Q${anchorInfo.startX + angleVal * 2} ${midY + moveY},${anchorInfo.startX + angleVal * 3} ${midY + moveY}
                        L${anchorInfo.endX - angleVal},${midY + moveY}
                        Q${anchorInfo.endX} ${midY + moveY}, ${anchorInfo.endX} ${midY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + moveY;
                    // Bottom Up, Left -> Right, Right -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startX + moveX) <= anchorInfo.startX) {
                            moveX = 0;
                        } else if ((anchorInfo.startX + moveX) > anchorInfo.endX - angleVal * 3) {
                            moveX = anchorInfo.endX - anchorInfo.startX - angleVal * 3;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX + angleVal + moveX},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.endY}, ${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Left -> Right, Right -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((midX + moveX) < anchorInfo.startX) {
                            moveX = anchorInfo.startX - midX;
                        } else if ((midX + moveX) > midX + angleVal) {
                            moveX = angleVal;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${midX + moveX},${anchorInfo.startY}
                        Q${midX + angleVal + moveX} ${anchorInfo.startY}, ${midX + angleVal + moveX} ${anchorInfo.startY - angleVal}
                        L${midX + angleVal + moveX},${anchorInfo.endY - angleVal}
                        Q${midX + angleVal + moveX} ${anchorInfo.endY - angleVal * 2},${midX + angleVal * 2 + moveX} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX + angleVal + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Left -> Right, Right -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;
                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.endX + angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.endX + angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.endX + angleVal * 2 + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.endX + angleVal * 2 + moveX},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX + angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.endX + angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    }
                } else {
                    // Bottom Up, Right -> Left, Right -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        if ((midY + moveY) > (anchorInfo.startY)) {
                            moveY = anchorInfo.startY - midY;
                        } else if ((midY + moveY) < anchorInfo.endY + angleVal * 3) {
                            // shapePoint가 endY를 넘어갈 경우 못넘어가도록 설정
                            moveY = anchorInfo.endY + angleVal * 3 - midY;
                        }
                        this.moveY = moveY;
                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal},${anchorInfo.startY} 
                        Q${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY},${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY - angleVal} 
                        L${anchorInfo.startX + angleVal * 2},${midY + moveY} 
                        Q${anchorInfo.startX + angleVal * 2} ${midY - angleVal + moveY},${anchorInfo.startX + angleVal} ${midY - angleVal + moveY} 
                        L${anchorInfo.endX + angleVal},${midY - angleVal + moveY} 
                        Q${anchorInfo.endX} ${midY - angleVal + moveY}, ${anchorInfo.endX} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX}, ${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    // Bottom Up, Right -> Left, Right -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        // shapePoint가 최소 startY보다 크거나
                        // if문을 else if로 처리했을 때 반례가 생겨버려서 두개의 if문으로 처리
                        if ((anchorInfo.startY - angleVal * 3) <= (midY + moveY)) {
                            moveY = anchorInfo.startY - midY - angleVal * 3;
                        }
                        if ((midY + moveY) < anchorInfo.endY + angleVal * 3) {
                            // shapePoint가 endY를 넘어갈 경우 못넘어가도록 설정
                            moveY = anchorInfo.endY + angleVal * 3 - midY;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX + angleVal * 2},${midY + moveY}
                        Q${anchorInfo.startX + angleVal * 2} ${midY - angleVal + moveY}, ${anchorInfo.startX + angleVal} ${midY - angleVal + moveY}
                        L${anchorInfo.endX - angleVal},${midY - angleVal + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${midY - angleVal + moveY}, ${anchorInfo.endX - angleVal * 2} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal + moveY;
                    // Bottom Up, Right -> Left, Right -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX + angleVal + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.endY - angleVal * 2},${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal + moveX;
                        shapePoint.cy = midY;
                    // Bottom Up, Right -> Left, Right -> Top
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startX + moveX) < anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.startY - angleVal}
                        L${anchorInfo.startX + angleVal * 2 + moveX},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.startX + angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    }
                }
            // startAnchor: Bottom
            } else if (this.anchorFrom.position === B_POSITION) {
            // direction: Left -> Right
                if (this.anchorFrom.x <= this.anchorTo.x) {
                    // Bottom Up, Left -> Right, Bottom -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.startY + angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    // Bottom Up, Left -> Right, Bottom -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal * 3},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY + angleVal + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    // Bottom Up, Left -> Right, Bottom -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${midX - angleVal},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${midX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${midX} ${anchorInfo.startY + moveY}
                        L${midX},${anchorInfo.endY - angleVal}
                        Q${midX} ${anchorInfo.endY - angleVal * 2},${midX + angleVal} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + midX - angleVal) / 2;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    // Bottom Up, Left -> Right, Bottom -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY + angleVal + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    }
                // Bottom Up, Right -> Left, Bottom -> Bottom
                } else {
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.startY + angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    // Bottom Up, Right -> Left, Bottom -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY + angleVal + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY + angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    // Bottom Up, Right -> Left, Bottom -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${midX + angleVal},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${midX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${midX} ${anchorInfo.startY + angleVal + moveY}
                        L${midX},${anchorInfo.endY - angleVal}
                        Q${midX} ${anchorInfo.endY - angleVal * 2},${midX - angleVal} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + midX) / 2;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    // Bottom Up, Right -> Left, Bottom -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startY + moveY) < anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY + angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal * 3},${anchorInfo.startY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY + angleVal * 2 + moveY}, ${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY + angleVal + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY + angleVal + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + anchorInfo.endX + angleVal * 2) / 2;
                        shapePoint.cy = anchorInfo.startY + angleVal * 2 + moveY;
                    }
                }
            }
        } else {
            // 위에서 아래 방향 링크(Top Down)
            if ((this.anchorTo.x - angleVal * (BLOCK_RECT_DEFAULT_WIDTH / 20) < this.anchorFrom.x && this.anchorTo.x + angleVal * (BLOCK_RECT_DEFAULT_WIDTH / 20) > this.anchorFrom.x) ||
            (this.anchorTo.y - angleVal * (BLOCK_RECT_DEFAULT_HEIGHT / 20) < this.anchorFrom.y && this.anchorTo.y + angleVal * (BLOCK_RECT_DEFAULT_HEIGHT / 20) > this.anchorFrom.y)) {
                points = `M${anchorInfo.startX} ${anchorInfo.startY} L${anchorInfo.endX} ${anchorInfo.endY}`;
                shapePoint.cx = midX;
                shapePoint.cy = midY;
            // startAnchor: Top
            } else if (this.anchorFrom.position === T_POSITION) {
                // direction: Left -> Right
                if (this.anchorFrom.x < this.anchorTo.x) {
                    // Top Down, Left -> Right, Bottom -> Right
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${midX - angleVal},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${midX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${midX} ${anchorInfo.startY + moveY}
                        L${midX},${anchorInfo.endY + angleVal}
                        Q${midX} ${anchorInfo.endY + angleVal * 2},${midX + angleVal} ${anchorInfo.endY + angleVal * 2}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY + angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + midX) / 2;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    // Top Down, Left -> Right, Bottom -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY},${anchorInfo.startX + angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal * 3},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY - angleVal + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX - angleVal * 2;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    // Top Down, Left -> Right, Bottom -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.startY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    // Top Down, Left -> Right, Bottom -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY - angleVal * 2 + moveY},${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY - angleVal + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    }
                // direction: Right -> Left
                } else {
                    // Top Down, Right -> Left, Bottom -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${midX + angleVal},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${midX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${midX} ${anchorInfo.startY + moveY}
                        L${midX},${anchorInfo.endY + angleVal}
                        Q${midX} ${anchorInfo.endY + angleVal * 2},${midX - angleVal} ${anchorInfo.endY + angleVal * 2}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY + angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + (midX + angleVal)) / 2;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    // Top Down, Right -> Left, Bottom -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY},${anchorInfo.startX - angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.endX - angleVal * 2} ${anchorInfo.startY - angleVal + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    // Top Down, Right -> Left, Bottom -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.startY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    // Top Down, Right -> Left, Bottom -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startY + moveY) > anchorInfo.startY) {
                            moveY = 0;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY - angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.startY - angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal * 3},${anchorInfo.startY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY - angleVal * 2 + moveY},${anchorInfo.endX + angleVal * 2} ${anchorInfo.startY - angleVal + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + (anchorInfo.endX + angleVal * 3)) / 2;
                        shapePoint.cy = anchorInfo.startY - angleVal * 2 + moveY;
                    }
                }
            // startAnchor: Left
            } else if (this.anchorFrom.position === L_POSITION) {
                // direction: Left -> Right
                if (this.anchorFrom.x <= this.anchorTo.x) {
                    // Top Down, Left -> Right, Left -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY} 
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY},${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY + angleVal} 
                        L${anchorInfo.startX - angleVal * 2 + moveX},${anchorInfo.endY + angleVal} 
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY + angleVal * 2},${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY + angleVal * 2} 
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY + angleVal * 2} 
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal}
                        L${anchorInfo.endX}, ${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Left -> Right, Left -> Bottom
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX - angleVal * 2 + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Left -> Right, Left -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX - angleVal * 2 + moveX},${anchorInfo.endY - angleVal * 3}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Left -> Right, Left -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX - angleVal * 2 + moveX},${midY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${midY + angleVal},${anchorInfo.startX - angleVal + moveX} ${midY + angleVal}
                        L${anchorInfo.endX + angleVal},${midY + angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${midY + angleVal}, ${anchorInfo.endX + angleVal * 2} ${midY + angleVal * 2}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = (midY + anchorInfo.startY) / 2;
                    }
                // Right -> Left
                } else {
                    // Top Down, Right -> Left, Left -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX - angleVal},${anchorInfo.endY + angleVal * 2}
                        Q${anchorInfo.startX - angleVal} ${anchorInfo.endY + angleVal * 3}, ${anchorInfo.startX - angleVal * 2} ${anchorInfo.endY + angleVal * 3}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY + angleVal * 3}
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 3}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal;
                        shapePoint.cy = midY;
                    // Top Down, Right -> Left, Left -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.endX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.endX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.endX - angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.endX - angleVal * 2 + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX - angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.endX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Right -> Left, Left -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        } else if ((anchorInfo.startX + moveX - angleVal * 4) < anchorInfo.endX) {
                            moveX = anchorInfo.endX - anchorInfo.startX + angleVal * 4;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX - angleVal * 2 + moveX},${anchorInfo.endY - angleVal * 3}
                        Q${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.startX - angleVal * 3 + moveX} ${anchorInfo.endY - angleVal * 2}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY - angleVal * 2}
                        Q${anchorInfo.endX} ${anchorInfo.endY - angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Right -> Left, Left -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.startX + moveX) > anchorInfo.startX) {
                            moveX = 0;
                        } else if ((anchorInfo.startX - (angleVal * 3) + moveX) < anchorInfo.endX) {
                            moveX = anchorInfo.endX - anchorInfo.startX + angleVal * 3;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX - angleVal + moveX} ${anchorInfo.startY}, ${anchorInfo.startX - angleVal + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX - angleVal + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.startX - angleVal + moveX} ${anchorInfo.endY}, ${anchorInfo.startX - angleVal * 2 + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX - angleVal + moveX;
                        shapePoint.cy = midY;
                    }
                }
            // startAnchor: Right
            } else if (this.anchorFrom.position === R_POSITION) {
                // Left -> Right
                if (this.anchorFrom.x <= this.anchorTo.x) {
                    // Top Down, Left -> Right, Right to Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.startX + moveX) < anchorInfo.startX) {
                            moveX = 0;
                        } else if ((anchorInfo.startX + (angleVal * 3) + moveX) > anchorInfo.endX) {
                            moveX = anchorInfo.endX - anchorInfo.startX - (angleVal * 3);
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX + angleVal + moveX},${anchorInfo.endY + angleVal * 2}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.endY + angleVal * 3}, ${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.endY + angleVal * 3}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY + angleVal * 3}
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 3}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Left -> Right, Right to Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((midX + moveX) < anchorInfo.startX) {
                            moveX = anchorInfo.startX - midX;
                        } else if ((midX + moveX + angleVal * 3) > anchorInfo.endX) {
                            moveX = anchorInfo.endX - midX - angleVal * 3;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${midX + moveX},${anchorInfo.startY}
                        Q${midX + angleVal + moveX} ${anchorInfo.startY}, ${midX + angleVal + moveX} ${anchorInfo.startY + angleVal}
                        L${midX + angleVal + moveX},${anchorInfo.endY - angleVal}
                        Q${midX + angleVal + moveX} ${anchorInfo.endY}, ${midX + angleVal * 2 + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX + angleVal + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Left -> Right, Right to Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((midX + moveX) < anchorInfo.startX) {
                            moveX = anchorInfo.startX - midX;
                        } else if ((midX + moveX + angleVal * 3) > anchorInfo.endX) {
                            moveX = anchorInfo.endX - midX - angleVal * 3;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${midX + moveX},${anchorInfo.startY}
                        Q${midX + angleVal + moveX} ${anchorInfo.startY}, ${midX + angleVal + moveX} ${anchorInfo.startY + angleVal}
                        L${midX + angleVal + moveX},${midY - angleVal * 3}
                        Q${midX + angleVal + moveX} ${midY - angleVal * 2},${midX + angleVal * 2 + moveX} ${midY - angleVal * 2}
                        L${anchorInfo.endX - angleVal},${midY - angleVal * 2}
                        Q${anchorInfo.endX} ${midY - angleVal * 2}, ${anchorInfo.endX} ${midY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX + angleVal + moveX;
                        shapePoint.cy = (anchorInfo.startY + angleVal + (midY - angleVal * 3)) / 2;
                    // Top Down, Left -> Right, Right to Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.endX + angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.endX + angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.endX + angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.endX + angleVal * 2 + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX + angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.endX + angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    }
                // dircetion: Right -> Left
                } else {
                    // Top Down, Right -> Left, Right -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal + moveX},${anchorInfo.startY} 
                        Q${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.startY},${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.startY + angleVal} 
                        L${anchorInfo.startX + angleVal * 2 + moveX},${anchorInfo.endY + angleVal} 
                        Q${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.endY + angleVal * 2},${anchorInfo.startX + angleVal + moveX} ${anchorInfo.endY + angleVal * 2} 
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY + angleVal * 2} 
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal}
                        L${anchorInfo.endX}, ${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    // Top Down, Right -> Left, Right -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        let newMoveY = moveY;
                        // if문을 else if로 처리했을 때 반례가 생겨버려서 두개의 if문으로 처리
                        if ((midY + newMoveY - angleVal * 3) <= anchorInfo.startY) {
                            newMoveY = anchorInfo.startY - midY + angleVal * 3;
                        }
                        if ((midY + newMoveY + angleVal * 3) >= anchorInfo.endY) {
                            newMoveY = anchorInfo.endY - midY - angleVal * 3;
                        }
                        this.moveY = newMoveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal * 2} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX + angleVal * 2},${midY + newMoveY}
                        Q${anchorInfo.startX + angleVal * 2} ${midY + angleVal + newMoveY}, ${anchorInfo.startX + angleVal} ${midY + angleVal + newMoveY}
                        L${anchorInfo.endX - angleVal},${midY + angleVal + newMoveY}
                        Q${anchorInfo.endX - angleVal * 2} ${midY + angleVal + newMoveY}, ${anchorInfo.endX - angleVal * 2} ${midY + angleVal * 2 + newMoveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + angleVal + newMoveY;
                    // Top Down, Right -> Left, Right -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX + angleVal + moveX},${midY - angleVal * 3}
                        Q${anchorInfo.startX + angleVal + moveX} ${midY - angleVal * 2},${anchorInfo.startX - angleVal + moveX} ${midY - angleVal * 2}
                        L${anchorInfo.endX + angleVal},${midY - angleVal * 2}
                        Q${anchorInfo.endX} ${midY - angleVal * 2}, ${anchorInfo.endX} ${midY - angleVal}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal + moveX;
                        shapePoint.cy = (anchorInfo.startY + (midY - angleVal * 3)) / 2;
                    // Top Down, Right -> Left, Right -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((anchorInfo.endX + moveX) < anchorInfo.endX) {
                            moveX = 0;
                        }
                        this.moveX = moveX;
                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX + angleVal + moveX},${anchorInfo.startY}
                        Q${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.startY}, ${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.startY + angleVal}
                        L${anchorInfo.startX + angleVal * 2 + moveX},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.startX + angleVal * 2 + moveX} ${anchorInfo.endY}, ${anchorInfo.startX + angleVal + moveX} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = anchorInfo.startX + angleVal * 2 + moveX;
                        shapePoint.cy = midY;
                    }
                }
            // startAnchor: Bottom
            } else if (this.anchorFrom.position === B_POSITION) {
                // direction: Left -> Right
                if (this.anchorFrom.x <= this.anchorTo.x) {
                    // Top Down, Left -> Right, Bottom -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.endY - (angleVal * 2) + moveY) < anchorInfo.endY) {
                            moveY = angleVal * 2;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.endY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.endY + angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${anchorInfo.endY + angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${anchorInfo.endY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.endY + angleVal * 2 + moveY;
                    // Top Down, Left -> Right, Bottom -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((midY - angleVal + moveY) < anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY + angleVal;
                        } else if ((midY + angleVal * 3 + moveY) > anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY - angleVal * 3;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + moveY}
                        Q${anchorInfo.startX} ${midY + angleVal + moveY}, ${anchorInfo.startX + angleVal} ${midY + angleVal + moveY}
                        L${anchorInfo.endX - angleVal * 3},${midY + angleVal + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${midY + angleVal + moveY}, ${anchorInfo.endX - angleVal * 2} ${midY + angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + (anchorInfo.endX - angleVal * 3)) / 2;
                        shapePoint.cy = midY + angleVal + moveY;
                    // Top Down, Left -> Right, Bottom -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((midY - angleVal * 3 + moveY) < anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY + angleVal * 3;
                        } else if ((midY + moveY) > anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY - angleVal * 3 + moveY}
                        Q${anchorInfo.startX} ${midY - angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${midY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${midY - angleVal * 2 + moveY}, ${anchorInfo.endX} ${midY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal * 2 + moveY;
                    // Top Down, Left -> Right, Bottom -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((midY + moveY) < anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY;
                        } else if ((midY + angleVal * 4 + moveY) > anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY - angleVal * 4;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + angleVal + moveY}
                        Q${anchorInfo.startX} ${midY + angleVal * 2 + moveY}, ${anchorInfo.startX + angleVal} ${midY + angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${midY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${midY + angleVal * 2 + moveY}, ${anchorInfo.endX + angleVal * 2} ${midY + angleVal * 3 + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + angleVal * 2 + moveY;
                    }
                // direction: Right -> Left
                } else {
                    // Top Down, Right -> Left, Bottom -> Bottom
                    if (this.anchorTo.position === B_POSITION) {
                        if ((anchorInfo.endY - angleVal + moveY) < anchorInfo.endY) {
                            moveY = angleVal;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${anchorInfo.endY + angleVal + moveY}
                        Q${anchorInfo.startX} ${anchorInfo.endY + angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${anchorInfo.endY + angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${anchorInfo.endY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${anchorInfo.endY + angleVal * 2 + moveY}, ${anchorInfo.endX} ${anchorInfo.endY + angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = anchorInfo.endY + angleVal * 2 + moveY;
                    // Top Down, Right -> Left, Bottom -> Left
                    } else if (this.anchorTo.position === L_POSITION) {
                        if ((midY + moveY) < anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY;
                        } else if ((midY + angleVal * 4 + moveY) > anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY - angleVal * 4;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + angleVal + moveY}
                        Q${anchorInfo.startX} ${midY + angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${midY + angleVal * 2 + moveY}
                        L${anchorInfo.endX - angleVal},${midY + angleVal * 2 + moveY}
                        Q${anchorInfo.endX - angleVal * 2} ${midY + angleVal * 2 + moveY}, ${anchorInfo.endX - angleVal * 2} ${midY + angleVal * 3 + moveY}
                        L${anchorInfo.endX - angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX - angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX - angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = (anchorInfo.startX + anchorInfo.endX - angleVal) / 2;
                        shapePoint.cy = midY + angleVal * 2 + moveY;
                    // Top Down, Right -> Left, Bottom -> Top
                    } else if (this.anchorTo.position === T_POSITION) {
                        if ((midY - angleVal * 3 + moveY) < anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY + angleVal * 3;
                        } else if ((midY + moveY) > anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY - angleVal * 3 + moveY}
                        Q${anchorInfo.startX} ${midY - angleVal * 2 + moveY}, ${anchorInfo.startX - angleVal} ${midY - angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal},${midY - angleVal * 2 + moveY}
                        Q${anchorInfo.endX} ${midY - angleVal * 2 + moveY}, ${anchorInfo.endX} ${midY - angleVal + moveY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY - angleVal * 2 + moveY;
                    // Top Down, Right -> Left, Bottom -> Right
                    } else if (this.anchorTo.position === R_POSITION) {
                        if ((midY + moveY) < anchorInfo.startY) {
                            moveY = anchorInfo.startY - midY;
                        } else if ((midY + angleVal * 4 + moveY) > anchorInfo.endY) {
                            moveY = anchorInfo.endY - midY - angleVal * 4;
                        }
                        this.moveY = moveY;

                        points = `M${anchorInfo.startX},${anchorInfo.startY}
                        L${anchorInfo.startX},${midY + moveY}
                        Q${anchorInfo.startX} ${midY + angleVal + moveY}, ${anchorInfo.startX - angleVal} ${midY + angleVal + moveY}
                        L${anchorInfo.endX + angleVal * 3},${midY + angleVal + moveY}
                        Q${anchorInfo.endX + angleVal * 2} ${midY + angleVal + moveY}, ${anchorInfo.endX + angleVal * 2} ${midY + angleVal * 2 + moveY}
                        L${anchorInfo.endX + angleVal * 2},${anchorInfo.endY - angleVal}
                        Q${anchorInfo.endX + angleVal * 2} ${anchorInfo.endY}, ${anchorInfo.endX + angleVal} ${anchorInfo.endY}
                        L${anchorInfo.endX},${anchorInfo.endY}`;
                        shapePoint.cx = midX;
                        shapePoint.cy = midY + angleVal + moveY;
                    }
                }
            }
        }
        return { points, shapePoint };
    }

    moveShapePoint(offsetX, offsetY) {
        let dragStartX = this.shapePointElement.dragStartX * 1;
        let dragStartY = this.shapePointElement.dragStartY * 1;
        let spX = this.shapePointElement.getAttribute('cx') * 1;
        let spY = this.shapePointElement.getAttribute('cy') * 1;
        this.moveX = offsetX - spX + this.moveX * 1 - dragStartX;
        this.moveY = offsetY - spY + this.moveY * 1 - dragStartY;

        this.adjustPoints(this.moveX, this.moveY);
    }

    _mousedownOnCP(e) {
        const line = __makeSvgElement('line', {
            x1: this.anchorFrom.x,
            y1: this.anchorFrom.y,
            x2: this.anchorFrom.x,
            y2: this.anchorFrom.y,
            stroke: 'gray',
            'stroke-dasharray': '5 2',
            'stroke-width': 2,
            'stroke-opacity': 0.9,
            'pointer-events': 'none'
        }, []);

        this.diagram.svg.appendChild(line);
        this.diagram.movingLine = {
            tempLine: line,
            originLink: this
        };
    }

    hide() {
        this.shapeElement.style.display = 'none';
        this.textElement.style.display = 'none';
        this.connectPointElement.style.display = 'none';
        this.shapePointElement.style.display = 'none';
    }

    show() {
        this.shapeElement.style.display = 'block';
        this.textElement.style.display = 'block';
        this.connectPointElement.style.display = 'block';
        this.shapePointElement.style.display = 'block';
    }

    hideDebugElement() {
        if (this.diagram.options.debugMode) {
            this.controlPointElement.style.display = 'none';
            this.controlPoint2Element.style.display = 'none';
            this.cpAuxLineElement.style.display = 'none';
            this.cpAuxLineElement2.style.display = 'none';
        }
    }

    showDebugElement() {
        if (this.diagram.options.debugMode) {
            this.controlPointElement.style.display = 'block';
            this.controlPoint2Element.style.display = 'block';
            this.cpAuxLineElement.style.display = 'block';
            this.cpAuxLineElement2.style.display = 'block';
        }
    }

    /**
     * @param {Link} link
     * @param {NodeWrapper} node
     */
    static serialize(link, node, block, custom) {
        let cnode = node.appendChild('choice');
        if (custom === CUSTOM_BLOCK) {
            cnode.addAttr('id', link.id);
            cnode.addAttr('event', link.blockOrigin.event);
            cnode.addAttr('target', link.blockDest.id);
            cnode.addAttr('svg-origin-anchor', link.anchorFrom.position);
            cnode.addAttr('svg-dest-anchor', reverseAnchorPosition[link.posDest]);
        } else {
            // let cnode = node.appendChild('choice');
            cnode.attr('event', link.caption);
            cnode.attr('target', link.blockDest.id);
            cnode.attr('svg-origin-anchor', reverseAnchorPosition[link.posOrigin]);
            cnode.attr('svg-dest-anchor', reverseAnchorPosition[link.posDest]);
            if (link.lineType === NORMAL_DIAGRAM_TYPE) {
                cnode.attr('link-move-x', link.moveX);
                cnode.attr('link-move-y', link.moveY);
            }
        }
    }

    /**
     * @param {Link} link
     * @param {NodeWrapper} node
     */
    static serializeToJSON(link, block, custom) {
        let choiceJSONArray = [];
        let choiceJSON = {};
        // Link가 Custom일 경우
        if (custom === CUSTOM_BLOCK) {
            choiceJSON._id = link.id;
            choiceJSON._event = link.blockOrigin.event;
            choiceJSON['_svg-origin-anchor'] = link.anchorFrom.position;
            choiceJSON['_svg-dest-anchor'] = reverseAnchorPosition[link.posDest];
        } else {
            // Link가 Normal일 경우
            // block에 연결된 링크가 한개일 경우
            if (block.links.size === 1) {
                if (link.blockDest.id !== block.id) {
                    choiceJSON._event = link.caption;
                    choiceJSON._target = link.blockDest.id;
                    choiceJSON['_svg-origin-anchor'] = reverseAnchorPosition[link.posOrigin];
                    choiceJSON['_svg-dest-anchor'] = reverseAnchorPosition[link.posDest];
                    if (link.lineType === NORMAL_DIAGRAM_TYPE) {
                        choiceJSON['svg-control-point'] = link.controlPoint.x + ',' + link.controlPoint.y;
                        choiceJSON['svg-control-point2'] = link.controlPoint2.x + ',' + link.controlPoint2.y;
                    }
                    return choiceJSON;
                }
            } else {
                // block에 연결된 링크가 여러개인 경우
                for (const link of block.links.values()) {
                    if (link.blockDest.id !== block.id) {
                        choiceJSON = {};
                        choiceJSON._event = link.caption;
                        choiceJSON._target = link.blockDest.id;
                        choiceJSON['_svg-origin-anchor'] = reverseAnchorPosition[link.posOrigin];
                        choiceJSON['_svg-dest-anchor'] = reverseAnchorPosition[link.posDest];
                        if (link.lineType === NORMAL_DIAGRAM_TYPE) {
                            choiceJSON['svg-control-point'] = link.controlPoint.x + ',' + link.controlPoint.y;
                            choiceJSON['svg-control-point2'] = link.controlPoint2.x + ',' + link.controlPoint2.y;
                        }
                        choiceJSONArray.push(choiceJSON);
                    }
                }
                if (choiceJSONArray.length === 1) {
                    return choiceJSON;
                } else {
                    return choiceJSONArray;
                }
            }
        }
    }

    /**
     * @param {Diagram} diagram
     * @param {NodeWrapper} node
     * @returns {Block} new block object
     */
    static deserialize(block, node, custom) {
        let diagram = block.diagram;
        let event = node.attr('event');
        let target = node.attr('target');
        let svgOriginAnchor = node.attr('svg-origin-anchor');
        let svgDestAnchor = node.attr('svg-dest-anchor');
        let convertedSvgOriginAnchor = convertAnchorPosition[svgOriginAnchor] || convertAnchorPosition.default; // deserialize 버전 다운그레이드 시
        let convertedSvgDestAnchor = convertAnchorPosition[svgDestAnchor] || convertAnchorPosition.default; // deserialize 버전 다운그레이드 시
        let controlPoint = null;
        let controlPoint2 = null;
        let moveX, moveY;

        if (node.attr('link-move-x') === null || node.attr('link-move-y') === null) {
            moveX = 0;
            moveY = 0;
        } else {
            moveX = node.attr('link-move-x');
            moveY = node.attr('link-move-y');
        }
        if (custom === CUSTOM_BLOCK) {
            const generatedLinkId = diagram.generateId();
            if (block.type === CUSTOM_EVENT_BLOCK) {
                block.actionDivContainer.dataset.linkId = generatedLinkId;
                block.link = generatedLinkId;
            }
            return new Link(diagram,
                generatedLinkId,
                event,
                block,
                diagram.components.get(target),
                event,
                convertAnchorPosition[svgDestAnchor],
                false,
                controlPoint,
                controlPoint2
            );
        } else {
            return new Link(diagram,
                diagram.generateId(),
                event,
                block,
                diagram.components.get(target),
                convertedSvgOriginAnchor,
                convertedSvgDestAnchor,
                false,
                moveX,
                moveY
            );
        }
    }

    /**
     * @param {Diagram} diagram
     * @param {NodeWrapper} node
     * @returns {Block} new block object
     */
    static deserializeToJSON(block, node, custom) {
        let diagram = block.diagram;
        let event = node.choice ? node.choice._event : node._event;
        let svgDestAnchor = node.choice ? node.choice['_svg-dest-anchor'] : node['_svg-dest-anchor'];
        let svgOriginAnchor = node.choice ? node.choice['_svg-origin-anchor'] : node['_svg-origin-anchor'];
        let target = node.choice ? node.choice._target : node._target;
        let controlPoint = null;
        let controlPoint2 = null;
        let cpAttr = node.choice ? node.choice['_svg-control-point'] : node['_svg-control-point'];
        let cpAttr2 = node.choice ? node.choice['_svg-control-point2'] : node['_svg-control-point2'];
        if (cpAttr) {
            let [cpX, cpY] = cpAttr.split(',');
            controlPoint = {
                x: parseFloat(cpX),
                y: parseFloat(cpY)
            };
        }
        if (cpAttr2) {
            let [cpX2, cpY2] = cpAttr2.split(',');
            controlPoint2 = {
                x: parseFloat(cpX2),
                y: parseFloat(cpY2)
            };
        }
        if (custom === CUSTOM_BLOCK) {
            const generatedLinkId = diagram.generateId();
            if (block.type === CUSTOM_EVENT_BLOCK) {
                block.actionDivContainer.dataset.linkId = generatedLinkId;
                block.link = generatedLinkId;
            }
            return new Link(diagram,
                generatedLinkId,
                event,
                block,
                diagram.components.get(target),
                event,
                convertAnchorPosition[svgDestAnchor],
                false,
                controlPoint,
                controlPoint2
            );
        } else {
            return new Link(diagram,
                diagram.generateId(),
                event,
                block,
                diagram.components.get(target),
                convertAnchorPosition[svgOriginAnchor],
                convertAnchorPosition[svgDestAnchor],
                false,
                controlPoint,
                controlPoint2
            );
        }
    }
}

/**
 * Memo
 */
class Memo extends ResizableComponent {
    /**
     * @example
     * @param {Diagram} diagram
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {string} text
     * @param {boolean} selected
     * @returns {object} memo object
     */
    constructor(diagram, id, x, y, w, h, text, color) {
        super(diagram, 'M', id);

        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.text = text;
        this.oldText = text;
        this.selected = false;
        this.shapePadding = 2;
        this.lookAndFeel = diagram.options.lookAndFeel.memo;
        this.colorWidth = this.w / MEMO_COLOR_LIST.length;
        this.isSelectable = false;

        if (!color) {
            this.color = this.lookAndFeel.backgroundColor;
        } else {
            this.color = color;
        }

        this.memoContainer = __makeSvgElement('g', {
        }, []);

        this.shapeElement = __makeSvgElement('rect', {
            'data-id': this.id,
            x,
            y,
            width: w,
            height: h,
            // 이것은 style 속성에 넣지 않는다. class 보다 우선하기 때문에 제어가 되지 않는다.
            stroke: this.setStrokeColor(this.color),
            'stroke-width': MEMO_STROKE_WIDTH,
            style: `
                fill: ${this.color};
                padding: ${this.shapePadding}px`
        }, ['draggable']);

        this.menuContainer = __makeSvgElement('g', { x: this.x, y: (this.y - MEMO_MENU_SIZE) }, []);

        // this.menuArea = __makeSvgElement('rect', {
        //     'data-id': this.id,
        //     x: this.x,
        //     y: this.y - MEMO_MENU_SIZE,
        //     width: this.colorWidth * MEMO_COLOR_LIST.length,
        //     height: MEMO_MENU_SIZE,
        //     class: 'menu-area',
        //     stroke: this.setStrokeColor(this.color),
        //     'stroke-width': MEMO_STROKE_WIDTH,
        //     fill: this.color,
        // }, ['draggable']);

        // this.menuIcon = __makeSvgElement('text', {
        //     class: 'menu-icon',
        //     x: this.w + this.x - MEMO_MENU_SIZE / 2,
        //     y: this.y - MEMO_MENU_SIZE / 2,
        //     fill: 'black',
        //     style: `
        //         cursor: pointer
        //     `
        // });

        this.minimalIcon = __makeSvgElement('text', {
            x: this.x + MEMO_MENU_SIZE / 2,
            y: this.y - MEMO_MENU_SIZE / 2,
            fill: 'black',
            style: `
                cursor: pointer
            `
        });

        // this.menuIcon.innerHTML = '...';
        this.minimalIcon.innerHTML = '_';

        this.textElement = __makeSvgElement('foreignObject', {
            class: 'memo-text',
            x: x + this.shapePadding,
            y: y + this.shapePadding,
            width: w - (this.shapePadding * 2),
            height: h - (this.shapePadding * 2),
            style: 'pointer-events: none'
        }, []);

        this.textArea = document.createElement('div');

        let textArea = this.textArea;
        textArea.className = 'svg-text';
        textArea.contentEditable = false;
        textArea.style.cssText = `
            white-space: pre;
            width: 100%;
            height: 100%;
            padding: 5px;
            font-size: ${this.lookAndFeel.fontSize};
            overflow: auto;
            pointer-events: none`;
        textArea.innerHTML = text;
        this.textElement.appendChild(textArea);

        // this.memoContainer.appendChild(this.menuArea);
        // this.memoContainer.appendChild(this.menuIcon);
        this.memoContainer.appendChild(this.shapeElement);
        this.memoContainer.appendChild(this.textElement);

        this.svg.appendChild(this.memoContainer);

        this.shapeElement.addEventListener('dblclick', e => this._mousedblclick(e));
        this.textArea.addEventListener('focusout', e => this._focusout(e));
        this.textArea.addEventListener('keydown', e => e.stopPropagation());
        this.textArea.addEventListener('keyup', e => e.stopPropagation());
        // this.menuIcon.addEventListener('click', e => this._loadColorTab());
        // this.minimalIcon.addEventListener('click', e => this._minimalMemo());

        // 이걸 꼭 ready하는 시점에서 해야하는지 의문
        if (diagram.ready) {
            diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.MemoAdded);
        }
    }

    setText(text) {
        this.textArea.textContent = text;
        this.text = text;
        this.oldText = text;
    }

    select() {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        let options = this.diagram.options;
        if (!this.selected) {
            __setSvgAttrs(this.shapeElement, {
                stroke: this.lookAndFeel.borderColorSelected,
                'stroke-width': MEMO_STROKE_WIDTH
            });
            // __setSvgAttrs(this.menuArea, {
            //     stroke: this.lookAndFeel.borderColorSelected,
            //     'stroke-width': MEMO_STROKE_WIDTH
            // });
            this.selected = true;
            this.diagram.appendToSelection(this);
        }
    }

    unselect() {
        if (this.diagram.lockLevel >= LOCK_MAX) {
            return;
        }
        let options = this.diagram.options;
        if (this.selected) {
            __setSvgAttrs(this.shapeElement, {
                stroke: this.setStrokeColor(this.color),
                'stroke-width': MEMO_STROKE_WIDTH
            });
            // __setSvgAttrs(this.menuArea, {
            //     stroke: this.setStrokeColor(this.color),
            //     'stroke-width': MEMO_STROKE_WIDTH
            // });
            this.selected = false;
            this.diagram.removeFromSelection(this);
        }
    }

    remove() {
        // this.memoContainer.removeChild(this.menuArea);
        // this.memoContainer.removeChild(this.menuIcon);
        this.memoContainer.removeChild(this.shapeElement);
        this.memoContainer.removeChild(this.textElement);
        this.svg.removeChild(this.memoContainer);
        this.diagram.components.delete(this.id);
        this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.MemoRemoved);
    }

    movePosition(relX, relY, newX, newY) {
        // if (this.menuArea) {
        //     this.menuArea.setAttributeNS(null, 'x', newX);
        //     this.menuArea.setAttributeNS(null, 'y', newY - 40);
        //     this.menuIcon.setAttributeNS(null, 'x', newX + this.w - 20);
        //     this.menuIcon.setAttributeNS(null, 'y', newY - 20);
        //     this.minimalIcon.setAttributeNS(null, 'x', newX + 20);
        //     this.minimalIcon.setAttributeNS(null, 'y', newY - 20);
        // }

        if (this.menuContainer) {
            const gElement = this.menuContainer.childNodes;
            let conX = newX;
            let conY = newY - MEMO_MENU_SIZE;
            gElement.forEach((childTag, offset) => {
                childTag.setAttribute('x', parseFloat(conX) + parseFloat(this.colorWidth * offset));
                childTag.setAttribute('y', parseFloat(conY));
            });
        }

        this.shapeElement.setAttributeNS(null, 'x', newX);
        this.shapeElement.setAttributeNS(null, 'y', newY);
        this.textElement.setAttributeNS(null, 'x', newX + this.shapePadding);
        this.textElement.setAttributeNS(null, 'y', newY + this.shapePadding);
    }

    _mousedblclick(e) {
        // TODO: Text가 선택되는 defaultAction(파랗게 블록이 생김)이 생김
        // 그것을 해결하기 위해서는 document에 dblClick을 걸고 거기서 처리를 하면 될것으로 예상
        if (this.diagram.isLocked()) {
            return;
        }
        // this.textArea.classList.remove('svg-text');
        this.textArea.contentEditable = true;
        this.textArea.style.pointerEvents = 'auto';
        this.oldText = this.textArea.textContent;
        this.textArea.focus();
    }

    _focusout(e) {
        this.textArea.classList.add('svg-text');
        this.textArea.contentEditable = false;
        this.textArea.style.pointerEvents = 'none';
        if (this.oldText !== this.textArea.textContent) {
            this.text = this.textArea.textContent;
            this.diagram.actionManager.append(ActionManager.MEMO_TEXT_MODIFIED,
                { memo: this, oldValue: this.oldText, newValue: this.text });
            this.diagram.fireEvent(EVENT_DIAGRAM_MODIFIED, this, ModifyEventTypes.MemoContentModified);
        }
    }

    alignRelativeSize(w, h) {
        if (this.diagram.isLocked()) {
            return;
        }
        if ((w !== 0 || h !== 0)) {
            this.w += w;
            this.h += h;
            let minWidth = 0;
            let minHeight = 0;
            if (this.diagram.options.nodeSize) {
                minWidth = this.diagram.options.nodeSize.memo.width;
                minHeight = this.diagram.options.nodeSize.memo.height;
            } else {
                minWidth = MEMO_DEFAULT_WIDTH;
                minHeight = MEMO_DEFAULT_HEIGHT;
            }
            if (this.w < minWidth) {
                this.w = minWidth;
            }
            if (this.h < minHeight) {
                this.h = minHeight;
            }
            this.colorWidth = this.w / MEMO_COLOR_LIST.length;
            // if (this.isSelectable) {
            //     const gElement = this.menuContainer.childNodes;
            //     gElement.forEach((childTag, offset) => {
            //         childTag.setAttributeNS(null, 'width', this.colorWidth);
            //         childTag.setAttribute('x', parseFloat(this.x) + parseFloat(this.colorWidth * offset));
            //     });
            // }

            this.shapeElement.setAttributeNS(null, 'width', this.w);
            this.shapeElement.setAttributeNS(null, 'height', this.h);
            this.textElement.setAttributeNS(null, 'width', this.w - (this.shapePadding * 2));
            this.textElement.setAttributeNS(null, 'height', this.h - (this.shapePadding * 2));

            // this.menuIcon.setAttributeNS(null, 'x', parseFloat(this.x) - parseFloat(MEMO_MENU_SIZE / 2) + this.w);
            this.textElement.setAttributeNS(null, 'width', this.w - (this.shapePadding * 2));
            this.textElement.setAttributeNS(null, 'height', this.h - (this.shapePadding * 2));
            // this.menuArea.setAttributeNS(null, 'width', this.w);

            return true;
        }
    }

    changeColor(color) {
        this.svg.removeChild(this.menuContainer);
        this.shapeElement.style.fill = color.fill;
        this.color = color.fill;
        // this.menuArea.style.fill = this.color;
        // this.menuArea.setAttribute('stroke', this.setStrokeColor(this.color));
        // this.menuArea.setAttribute('stroke-width', MEMO_STROKE_WIDTH);
        this.shapeElement.setAttribute('stroke', this.setStrokeColor(this.color));
        this.shapeElement.setAttribute('stroke-width', MEMO_STROKE_WIDTH);

        // this.memoContainer.appendChild(this.menuArea);
        // this.memoContainer.appendChild(this.menuIcon);
        this.unselect();
        // this.svg.appendChild(this.minimalIcon);
        this.menuContainer.innerHTML = null;
    }

    setStrokeColor(color) {
        const rgbValue = color.match(/\d+/g).map(Number);
        // this.color보다 약간 옅은 색으로 하기 위해 rgb의 각 값을 10빼줌
        const newRgbValue = rgbValue.map((value) => {
            return value - 10;
        });
        const rgb = `rgb(${newRgbValue.join(', ')})`;
        return rgb;
    }

    _loadColorTab() {
        this.select();
        this.isSelectable = true;
        // this.menuIcon.remove();
        MEMO_COLOR_LIST.forEach((color) => {
            const rect = __makeSvgElement('rect', {
                x: parseFloat(this.x) + parseFloat(this.colorWidth * color.offset),
                y: this.y - MEMO_MENU_SIZE,
                width: this.colorWidth,
                height: MEMO_MENU_SIZE,
                'stroke-width': 1,
                style: `
                    fill: ${color.fill};
                `
            }, []);
            this.menuContainer.appendChild(rect);

            rect.addEventListener('click', () => {
                this.changeColor(color);
            });
        });
        this.svg.appendChild(this.menuContainer);
    }

    _minimalMemo() {
        this.minimalIcon.innerHTML = '+';
        // this.svg.removeChild(this.shapeElement);
        // this.svg.removeChild(this.textElement);
        // this.shapeElement = null;
        // this.textElement = null;
        this.shapeElement.style.visibility = 'hidden';
        this.textElement.style.visibility = 'hidden';
        // this.menuArea.setAttribute('width', '100');
    }

    /**
     * @param {Memo} memo
     * @param {NodeWrapper} node
     */
    static serialize(memo, node) {
        node.attr('id', memo.id);
        const convertText = memo.textArea.innerHTML
            .replace(/<div>/g, '&#10;')
            .replace(/<\/div>/g, '')
            .replace(/<br>/g, '');
        let textNode = node.appendChild('text');
        textNode.value(convertText);
        let svgNode = node.appendChild('svg');
        let boundsNode = svgNode.appendChild('bounds');
        boundsNode.value(`${memo.x},${memo.y},${memo.w},${memo.h}`);
        node.attr('color', memo.color);
    }

    /**
     * @param {Memo} memo
     * @param {NodeWrapper} node
     */
    static serializeToJSON(memo) {
        let memoJSON = { svg: {} };
        memoJSON._id = memo.id;
        memoJSON.text = memo.text;
        memoJSON.svg.bounds = `${memo.x},${memo.y},${memo.w},${memo.h}`;
        memoJSON.color = memo.color;
        return memoJSON;
    }

    /**
     * @param {Diagram} diagram
     * @param {NodeWrapper} node
     * @returns {Memo} new memo object
     */
    static deserialize(diagram, node) {
        let text = node.child('text').value();
        let bounds = node.child('svg/bounds').value();
        let [x, y, w, h] = bounds.split(',');
        let color = node.node.getAttribute('color');

        return new Memo(
            diagram,
            diagram.generateId(),
            parseFloat(x),
            parseFloat(y),
            parseFloat(w),
            parseFloat(h),
            text);
    }

    /**
     * @param {Diagram} diagram
     * @param {NodeWrapper} node
     * @returns {Memo} new memo object
     */
    static deserializeToJSON(diagram, node) {
        let text = node.text;
        let bounds = node.svg.bounds;
        let [x, y, w, h] = bounds.split(',');
        let color = node.color;

        return new Memo(
            diagram,
            diagram.generateId(),
            parseFloat(x),
            parseFloat(y),
            parseFloat(w),
            parseFloat(h),
            text);
    }
}

/* if (!globalThis.DOMParser) {
    await import('jsdom').then(jsdom => {
        globalThis.DOMParser = (new jsdom.JSDOM()).window.DOMParser;
    }).catch(e =>
        console.error('module not loaded:', e)
    );
} */

/**
 * NodeWrapper
 */
class NodeWrapper {
    /**
     * parseFromXML
     * @param {string} xmlText XML Text
     * @return {NodeWrapper} NodeWrapper
     */
    static parseFromXML(xmlText) {
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        return new NodeWrapper(xmlDoc);
    }

    /**
     * constructor
     * @param node DOMParser Node
     * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
     */
    constructor(node) {
        if (node === undefined) {
            throw new Error('Node argument required');
        }

        if (typeof node === 'string') {
            // 문자열로 입력하는 경우 rootNode 의 이름으로 보고
            // XML 문서를 새롭게 만든다. 그리고 이 클래스는 rootNode
            // 를 가르키도록 설정한다.
            let rootName = node;
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                 <${rootName}></${rootName}>`,
                'text/xml');
            this.doc = xmlDoc;
            this.node = xmlDoc.childNodes[0];
        } else {
            if (node.ownerDocument) {
                this.doc = node.ownerDocument;
                this.node = node;
            } else {
                // 이 경우는 node 자체가 document 객체이며
                // 이 경우도 사용가능하도록 해줌.
                this.doc = node;
                this.node = node.childNodes[0];
            }
        }

        this.nodeType = this.node.nodeType;
        // Node.ELEMENT_NODE            : 1
        // Node.ATTRIBUTE_NODE          : 2
        // Node.TEXT_NODE               : 3
        // Node.CDATA_SECTION_NODE      : 4
        // Node.COMMENT_NODE            : 8
        // Node.DOCUMENT_NODE           : 9
        if (this.nodeType !== 1) {
            throw new Error('Only Element node allowed');
        }
    }

    /**
     * root 노드를 반환한다.
     */
    root() {
        // Root node 는 반드시 하나 있어야 한다.
        // 없으면 XML 문법 오류로 볼 수 있다.
        return new NodeWrapper(this.doc.childNodes[0]);
    }

    /**
     * 상위 노드를 반환한다.
     */
    parent() {
        return new NodeWrapper(this.node.parentNode);
    }

    /**
     * 주어진 path 를 만족하는 Child Node 를 반환한다.
     * 복수의 Node 가 있는 경우 첫번째 것을 가져온다.
     * 입력하지 않거나 유효한 값이 아니면 기본값인 "*" 가 사용된다.
     * 이 경우에는 바로 하위에 있는 Child Node 중 첫번째 것을 반환한다.
     * @param {string} path xpath expression
     * @returns {NodeWrapper} Child Node
     */
    child(path) {
        // 주의) path 가 / 로 시작하면 rootNode 를 가리키지만
        // 아래에서는 현재 node 의 context 의 하위에서 찾게 된다.
        // 주의) path 의 말단은 Element Node 여야 한다.
        if (!path) {
            path = '*';
        }
        let iterator = this.doc.evaluate(path,
            this.node,
            null,
            5, // XPathResult.ORDERED_NODE_ITERATOR_TYPE
            null);
        let child = iterator.iterateNext();
        return child ? new NodeWrapper(child) : null;
    }

    /**
     * 주어진 path 를 만족하는 모든 Child Node 들을 List 로 반환한다.
     * 입력하지 않거나 유효한 값이 아니면 기본값인 "*" 가 사용된다.
     * 이 경우에는 바로 하위에 있는 모든 Child Node 들을 가져온다.
     * @param {string} path xpath expression
     * @returns {NodeWrapper[]} NodeWrapper list
     */
    children(path) {
        // 주의) path 가 / 로 시작하면 rootNode 를 가리키지만
        // 아래에서는 현재 node 의 context 의 하위에서 찾게 된다.
        // 주의) path 의 말단은 Element Node 여야 한다.
        if (!path) {
            path = '*';
        }
        let iterator = this.doc.evaluate(path,
            this.node,
            null,
            5, // XPathResult.ORDERED_NODE_ITERATOR_TYPE
            null);
        let children = [];
        let child = null;
        while ((child = iterator.iterateNext())) {
            children.push(new NodeWrapper(child));
        }
        return children;
    }

    /**
     * 새로운 element 를 만들어 현재 Node 의 child 로 저장한 후 반환한다.
     * @param {string} name new child element name
     */
    appendChild(name, namespaceURI = undefined) {
        let node;
        if (namespaceURI === undefined) {
            node = this.doc.createElement(name);
        } else {
            // namespaceURI 는 null 일 수 있음.
            node = this.doc.createElementNS(namespaceURI, name);
        }
        this.node.appendChild(node);
        return new NodeWrapper(node);
    }

    /**
     * @param {any} node NodeWrapper or Node
     */
    appendNode(node) {
        if (node instanceof NodeWrapper) {
            this.node.appendChild(node.node);
        } else {
            this.node.appendChild(node);
        }
    }

    /**
     * xpath 에 해당하는 child 를 모두 제거한다.
     * @param {string} path xpath expression
     */
    removeChild(path) {
        for (let child of this.children(path)) {
            this.node.removeChild(child.node);
        }
    }

    /**
     * 파라미터 val 이 주어진다면 현재 노드의 textContent 값을 변경한다.
     * 파라미터가 주어지지 않는다면 기존의 값을 반환한다.
     * @param {any} val new value
     */
    value(val = undefined) {
        if (val === undefined) {
            return this.node.textContent;
        } else {
            this.node.textContent = val;
        }
    }

    /**
     * 현재 노드의 textContent 값을 parseInt() 를 사용하여
     * integer 로 변환하여 반환한다.
     */
    valueAsInt() {
        return parseInt(this.value());
    }

    /**
     * 현재 노드의 textContent 값이 대소문자 구분없이 "true" 인 경우에 true 를 반환한다.
     */
    valueAsBoolean() {
        return String(this.value()).toLowerCase() === 'true';
    }

    /**
     * attrs
     */
    attrs() {
        let attrs = {};
        for (let item of this.node.attributes) {
            attrs[item.name] = item.value;
        }
        return attrs;
    }

    /**
     * 현재 노드의 attribute 값을 가져오거나 새 값을 저장한다.
     * 두번째 파라미터 value 가 주어진다면 해당 파라미터의 값을 변경하거나 추가한다.
     * 두번째 파라미터가 주어지지 않는다면 attribute 값을 반환하거나 해당
     * attribute 가 존재하지 않는다면 null 을 반환한다.
     * @param {string} name attribute name
     * @param {any} value new attribute value
     */
    attr(name, value = undefined) {
        let attributes = this.node.attributes;
        let item = attributes.getNamedItem(name);
        if (value === undefined) {
            // getNamedItem() 해당 이름이 없다면 null 반환.
            return item === null ? null : item.value;
        } else {
            if (item === null) {
                let attr = this.doc.createAttribute(name);
                attr.value = value;
                attributes.setNamedItem(attr);
            } else {
                item.value = value;
            }
        }
    }

    /**
     * attribute 의 값을 parseInt() 로 변환하여 반환한다.
     * @param {string} name attribute name
     */
    attrAsInt(name) {
        // parseInt(null): NaN 가 발생할 수 있다.
        return parseInt(this.attr(name));
    }

    /**
     * attribute 의 값이 대소문자 상관없이 "true" 와
     * 일치하는 경우에는 true 를 반환한다.
     * @param {string} name attribute name
     */
    attrAsBoolean(name) {
        return String(this.attr(name)).toLowerCase() === 'true';
    }

    /**
     * @param {string} name attribute name
     */
    removeAttribute(name) {
        this.node.removeAttribute(name);
    }

    /**
     * toString()
     */
    toString(declaration = true, version = '1.1') {
        if (!globalThis.XSLTProcessor) {
            // no XSLTProcessor in Node
            return this.node.outerHTML;
        }
        try {
            if (!NodeWrapper.xsltDoc) {
                // Class 의 static 선언으로 옮기면 어떤 환경에서는 에러가 발생한다.
                NodeWrapper.xsltDoc = new DOMParser().parseFromString(`
                    <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:output 
                            method="xml"
                            indent="yes"
                            standalone="yes"
                            version="${version}"
                            encoding="utf-8"
                            cdata-section-elements="functions source"
                            omit-xml-declaration="yes" />
                        <xsl:strip-space elements="*"/>
                        <xsl:template match="para[content-style][not(text())]">
                            <xsl:value-of select="normalize-space(.)"/>
                        </xsl:template>
                        <xsl:template match="node()|@*">
                            <xsl:copy>
                                <xsl:apply-templates select="node()|@*"/>
                            </xsl:copy>
                        </xsl:template>
                    </xsl:stylesheet>`, 'application/xml');
            }

            // outerHTML 보다 formatting 잘 되어 보기 편하다.
            const xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(NodeWrapper.xsltDoc);
            const resultDoc = xsltProcessor.transformToDocument(this.node);
            let xmlText = '';
            if (declaration) {
                xmlText = `<?xml version="${version}" encoding="utf-8"?>\n`;
            }
            xmlText += new XMLSerializer().serializeToString(resultDoc);
            return xmlText;
        } catch (e) {
            console.error(e);
            return this.node.outerHTML;
        }
    }

    addAttr(findAttr, addItem) {
        this.node.setAttribute(findAttr, addItem);
    }
}

export { Diagram, ModifyEventTypes, KeyActionNames, NodeWrapper, Block, Link, ActionManager };
