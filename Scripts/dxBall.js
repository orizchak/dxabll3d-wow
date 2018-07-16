/// <reference path="dat.gui.js" />
/// <reference path="dxBall.js" />
/// <reference path="jquery-1.12.4.js" />
/// <reference path="OrbitControls.js" />
/// <reference path="stats.js" />
/// <reference path="three.js" />

$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results == null) {
        return null;
    }
    else {
        return results[1] || 0;
    }
}

var dxBall = (function () {

    var img = {
        background: "http://i.imgur.com/MHkaGX1.jpg",
        ball: "http://i.imgur.com/RyfbzCFg.jpg",
        bricks: [
        "http://i.imgur.com/9Y0yvlS.jpg",
        "http://i.imgur.com/XlEPs6y.jpg",
        "http://i.imgur.com/N2mSNHj.jpg",
        "http://i.imgur.com/EvIr5sg.jpg",
        "http://i.imgur.com/zMhfxVb.jpg",
        "http://i.imgur.com/0tCBPn6.jpg",
        "http://i.imgur.com/Pz90Qkw.jpg",
        "http://i.imgur.com/U6eQfDK.jpg",
        "http://i.imgur.com/jYNQFpd.jpg",
        "http://i.imgur.com/Q00aX0u.jpg",
        ],
        bullet: "http://i.imgur.com/u9Cs6CH.jpg",
        decrease_ball: "http://i.imgur.com/IfQdm4M.png",
        decrease_board: "http://i.imgur.com/UInRp0F.png",
        gun: "http://i.imgur.com/4cer6KP.png",
        gun_board: "http://i.imgur.com/GCsbzd2.jpg",
        increase_ball: "http://i.imgur.com/OO4cQm3.png",
        increase_board: "http://i.imgur.com/Vm7VPQn.png",
        split_ball: "http://i.imgur.com/S1ZKQTd.png"
    };

    var levels = [
        { width: 20, height: 10, depth: 50, },
        { width: 30, height: 15, depth: 60, },
        { width: 40, height: 20, depth: 70, },
        { width: 50, height: 25, depth: 80, },
        { width: 60, height: 30, depth: 90, },
        { width: 70, height: 35, depth: 100, },
        { width: 80, height: 40, depth: 110, },
        { width: 90, height: 45, depth: 120, },
        { width: 100, height: 50, depth: 130, },
        { width: 110, height: 55, depth: 140, },
    ];

    var loader = new THREE.TextureLoader();
    loader.setCrossOrigin("*");
    /*global variables*/
    var webGLContainer = $("#webGL-container");

    var scene, camera, renderer;
    var controls, guiControls, datGUI, stats;
    var board, wall, textMesh = null, font, presents, bullets;
    var boardSize, boardBoundries, ballSpeed = 0, boardScaleSize = 1.1;
    var bricksTextures = [], presentActions = [];

    var gun_board_texture = loader.load(img.gun_board);

    var balls;

    var level = getLevel();

    var settings = getSettings();

    var planes = {
        top: {},
        right: {},
        bottom: {},
        left: {},
        back: {},
        front: {}
    }

    return {
        init: init
    }

    function init() {

        loadFont(function () {
            settings = getSettings();

            initScene();
            initCamera();
            initRenderer()

            initOrbitControls();
            initDatGui();
            initStats();

            initNewGame();

            initWindowResize();
            initKeyboardEvents();

            webGLContainer.append(renderer.domElement);
            webGLContainer.append(stats.domElement);

            render();
        });
    }

    function getDefaultBallDirection() {

        var x = ((Math.random()) * 2 - 1) * 0.005;
        var y = ((Math.random()) * 2 - 1) * 0.005;

        return new THREE.Vector3(x, y, -0.005);
    }

    function getLevel() {
        var levelFromQuery = parseInt($.urlParam("level")) - 1;
        return levelFromQuery >= 0 && levelFromQuery < levels.length ? levelFromQuery : 0;
    }

    function getSettings() {

        return {
            gameWidth: levels[level].width,
            gameHeight: levels[level].height,
            gameDepth: levels[level].depth,
            backgroundColor: 0x292ED6,
            hitColor: 0x0CE829,
            surfaceColor: 0xD1DBDE,
            deadColor: 0xE80C0F,
            boardColor: 0x156289,
            brickSpace: 2,
            brickWidth: 6,
            brickHeight: 2,
            brickDepth: 3,
            arrowKeyOffset: 4
        };
    }

    function loadFont(callback) {
        var loader = new THREE.FontLoader();
        var fontUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_regular.typeface.json';
        loader.load(fontUrl, function (loadedFont) {
            font = loadedFont;
            callback();
        });
    }

    function initNewGame() {
        clearScene();
        settings = getSettings();

        initCamera();
        initOrbitControls();

        initGameObjects();
        stopGun();

        startGame();
    }

    function clearScene() {
        if (scene) {
            for (var i = scene.children.length - 1; i >= 0; i--) {
                scene.remove(scene.children[i]);
            }
        }
    }

    function startGame() {
        showTextMessage("Level " + (level + 1), 0x16A103)
        bindStartEvent();
    }

    function bindStartEvent() {
        $(document).on("click keydown touchstart", start);
    }

    function unbindStartEvent() {
        $(document).off("click keydown touchstart", start);
    }

    function start() {
        planes.front.visible = false;
        resetBall();
        startBalls();
        textMesh.visible = false;
        unbindStartEvent();
    }

    function initScene() {
        scene = new THREE.Scene();
        var axisHelper = new THREE.AxisHelper(20);
        //scene.add(axisHelper);

        var backgroundTexture = loader.load(img.background);

        scene.background = backgroundTexture;
    }

    function initCamera() {
        if (!camera) {
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        }

        camera.position.x = 0;
        camera.position.y = settings.gameHeight - 2;
        camera.position.z = settings.gameDepth / 2 + settings.gameHeight + level + 5;
        camera.lookAt(scene.position);
    }

    function initRenderer() {
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);

        renderer.shadowMap.enabled = false;
        renderer.shadowMapEnabled = true;

        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMapType = THREE.PCFSoftShadowMap;

        renderer.shadowMapSoft = true;
    }

    function initOrbitControls() {
        //controls = new THREE.OrbitControls(camera, renderer.domElement);
        //controls.enableDamping = true;
        //controls.dampingFactor = 0.25;
        //controls.enableZoom = false;
    }

    function initDatGui() {
        guiControls = new function () {
            this.ballSpeed = ballSpeed;
            this.startBalls = startBalls;
            this.stopBalls = stopBalls;
            this.resetBall = resetBall;
        }

        datGUI = new dat.GUI();

        datGUI.add(guiControls, 'ballSpeed', 0, 100).listen();
        datGUI.add(guiControls, 'startBalls');
        datGUI.add(guiControls, 'stopBalls');
        datGUI.add(guiControls, 'resetBall');

        datGUI.close();
    }

    function initStats() {
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
    }

    function initWindowResize() {
        $(window).resize(function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    function initGameObjects() {
        initLight();
        initGameSurface();
        initWall();
        initPresents();
        initBoard();
        initBall();
    }

    function initLight() {

        var spotLight1 = new THREE.SpotLight(0xffffff);
        spotLight1.position.set(-settings.gameWidth / 2, settings.gameHeight, settings.gameDepth / 2 + 10);
        spotLight1.castShadow = true;
        scene.add(spotLight1);

        var spotLight2 = new THREE.SpotLight(0xffffff);
        spotLight2.position.set(settings.gameWidth / 2, settings.gameHeight, settings.gameDepth / 2 + 10);
        spotLight2.castShadow = true;
        scene.add(spotLight2);

        //var helper = new THREE.SpotLightHelper(spotLight1);
        //scene.add(helper);
    }

    function initGameSurface() {
        planes.top = CreateNewPlane(settings.gameWidth, settings.gameDepth);
        planes.top.rotation.x = 0.5 * Math.PI
        planes.top.position.set(0, settings.gameHeight, 0);

        planes.right = CreateNewPlane(settings.gameDepth, settings.gameHeight);
        planes.right.rotation.y = -0.5 * Math.PI
        planes.right.position.set(settings.gameWidth / 2, settings.gameHeight / 2, 0);

        planes.bottom = CreateNewPlane(settings.gameWidth, settings.gameDepth);
        planes.bottom.rotation.x = -0.5 * Math.PI
        planes.bottom.position.set(0, 0, 0);

        planes.left = CreateNewPlane(settings.gameDepth, settings.gameHeight);
        planes.left.rotation.y = -0.5 * Math.PI
        planes.left.position.set(-settings.gameWidth / 2, settings.gameHeight / 2, 0);

        planes.back = CreateNewPlane(settings.gameHeight, settings.gameWidth);
        planes.back.rotation.z = -0.5 * Math.PI
        planes.back.position.set(0, settings.gameHeight / 2, -settings.gameDepth / 2);

        planes.front = CreateNewPlane(settings.gameHeight, settings.gameWidth);
        planes.front.rotation.z = -0.5 * Math.PI
        planes.front.position.set(0, settings.gameHeight / 2, settings.gameDepth / 2);
        planes.front.material.color.setHex(settings.deadColor);
        planes.front.visible = false;

        scene.add(planes.top);
        scene.add(planes.right);
        scene.add(planes.bottom);
        scene.add(planes.left);
        scene.add(planes.back);
        scene.add(planes.front);
    }

    function CreateNewPlane(width, height) {
        var planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
        var planeMaterial = new THREE.MeshLambertMaterial({ color: settings.surfaceColor, side: THREE.DoubleSide });
        planeMaterial.transparent = true;
        planeMaterial.opacity = 0.5;

        var plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.receiveShadow = true;
        plane.castShadow = true;

        return plane;
    }

    function initPresents() {
        presents = new THREE.Object3D();
        presents.position.x = wall.position.x;
        presents.position.y = wall.position.y;
        presents.position.z = wall.position.z;

        scene.add(presents);

        bullets = new THREE.Object3D();
        scene.add(bullets);
    }

    function initPresentsActions() {
        presentActions = [
        {
            imageTexture: loader.load(img.decrease_ball),
            hitCallback: decrease_ball
        },
        {
            imageTexture: loader.load(img.increase_ball),
            hitCallback: increase_ball
        },
        {
            imageTexture: loader.load(img.decrease_board),
            hitCallback: decrease_board
        },
        {
            imageTexture: loader.load(img.increase_board),
            hitCallback: increase_board
        },
        {
            imageTexture: loader.load(img.split_ball),
            hitCallback: split_ball
        },
        {
            imageTexture: loader.load(img.gun),
            hitCallback: gun_board
        }
        ];
    }

    function initWall() {
        wall = new THREE.Object3D();

        bricksTextures = [];
        for (var i = 0; i < 10; i++) {
            bricksTextures.push(loader.load(img.bricks[i]));
        }

        initPresentsActions();
        initWallBricks();

        var wallSize = new THREE.Box3().setFromObject(wall);

        wall.position.x = -(Math.abs(wallSize.min.x) + Math.abs(wallSize.max.x)) / 2 + settings.brickWidth / 2;
        wall.position.y = 2;
        wall.position.z = -settings.gameDepth / 2 + 10;

        wall.castShadow = true;
        wall.receiveShadow = true;

        scene.add(wall);
    }

    function initWallBricks() {
        var geometry = new THREE.BoxGeometry(settings.brickWidth, settings.brickHeight, settings.brickDepth);

        var numOfBricks_width = settings.gameWidth / (settings.brickWidth + settings.brickSpace) - 1;
        var numOfBricks_height = settings.gameHeight / (settings.brickHeight + settings.brickSpace) - 1;
        var numOfBricks_depth = level + 1;

        var action;

        for (var i = 0; i < numOfBricks_width; i++) {
            for (var j = 0; j < numOfBricks_height; j++) {
                for (var k = 0; k < numOfBricks_depth; k++) {
                    action = presentActions[Math.floor((Math.random() * 100) + 1) % presentActions.length];

                    var birckTexture = bricksTextures[k];

                    var material = new THREE.MeshLambertMaterial();

                    material.map = birckTexture;

                    var brick = new THREE.Mesh(geometry, material);

                    brick.position.x = i * (settings.brickWidth + settings.brickSpace);
                    brick.position.y = j * (settings.brickHeight + settings.brickSpace);
                    brick.position.z = k * (settings.brickDepth + settings.brickSpace);

                    brick.doubleSided = true;
                    brick.castShadow = true;
                    brick.receiveShadow = true;

                    brick.action = action;

                    wall.add(brick);
                }
            }
        }
    }

    function increase_ball() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];

            ball.scale.x *= 1.2;
            ball.scale.y *= 1.2;
            ball.scale.z *= 1.2;

            blinkObject(ball, 0xffffff, 0x02FA51);
        }
    }

    function decrease_ball() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];

            ball.scale.x *= 0.8;
            ball.scale.y *= 0.8;
            ball.scale.z *= 0.8;

            blinkObject(ball, 0xffffff, 0xFA0223);
        }
    }

    function increase_board() {
        board.scale.x *= boardScaleSize;
        board.scale.y *= boardScaleSize;

        board.scale.x = Math.min(board.scale.x, 1.5);
        board.scale.y = Math.min(board.scale.y, 1.5);

        blinkObject(board, settings.boardColor, 0x02FA51);
    }

    function decrease_board() {
        board.scale.x /= boardScaleSize;
        board.scale.y /= boardScaleSize;

        board.scale.x = Math.max(board.scale.x, 0.5);
        board.scale.y = Math.max(board.scale.y, 0.5);

        blinkObject(board, settings.boardColor, 0xFA0223);
    }

    function split_ball() {
        var ball = balls.children[0];

        var newBall = createNewBall();

        newBall.position.x = ball.position.x;
        newBall.position.y = ball.position.y;
        newBall.position.z = ball.position.z;

        balls.add(newBall);
    }

    var lastTimeId;
    function gun_board() {
        clearTimeout(lastTimeId);

        blinkObject(board, settings.boardColor, 0x02FA51);

        startGun();

        lastTimeId = setTimeout(stopGun, 10000);
    }

    function startGun() {
        board.material.map = gun_board_texture;
        board.material.needsUpdate = true;

        $(document).on("click touchstart", fireGun);
    }

    function fireGun() {
        log("fireGun");

        var bullet1 = createNewBullet();

        bullet1.position.x = board.position.x + 2;
        bullet1.position.y = board.position.y + 2;
        bullet1.position.z = board.position.z;

        var bullet2 = createNewBullet();

        bullet2.position.x = board.position.x - 2;
        bullet2.position.y = board.position.y + 2;
        bullet2.position.z = board.position.z;

        bullets.add(bullet1);
        bullets.add(bullet2);
    }

    function createNewBullet() {
        var radius = settings.brickHeight / 4;

        var sphereGeometry = new THREE.SphereGeometry(radius, 10, 10);
        var sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        sphereMaterial.map = loader.load(img.bullet);

        var newBullet = new THREE.Mesh(sphereGeometry, sphereMaterial);

        return newBullet;
    }

    function stopGun() {
        board.material.map = null;
        board.material.needsUpdate = true;

        $(document).off("click touchstart", fireGun);
    }

    function blinkObject(obj, sourceColor, blinkColor) {
        var maxBlinks = 1;
        var currBlink = 3;
        blink(obj, sourceColor, blinkColor, currBlink);

        function blink(obj, sourceColor, blinkColor, currBlink) {
            obj.material.color.setHex(blinkColor);
            setTimeout(function () {
                obj.material.color.setHex(sourceColor);
                currBlink++;
                if (currBlink < maxBlinks) {
                    setTimeout(function () {
                        blink(obj, sourceColor, blinkColor, currBlink)
                    }, 200);
                }
            }, 200)
        }
    }



    function initBoard() {
        boardSize = {
            width: settings.gameWidth * 0.3,
            height: settings.gameHeight * 0.3,
            depthPos: settings.gameDepth / 2 - 2,
        }

        boardBoundries = {
            maxX: settings.gameWidth / 2 - boardSize.width / 2,
            minX: -(settings.gameWidth / 2 - boardSize.width / 2),
            maxY: settings.gameHeight - boardSize.height / 2,
            minY: boardSize.height / 2,
        };

        var geometry = new THREE.BoxGeometry(boardSize.width, boardSize.height, 1);
        var material = new THREE.MeshPhongMaterial({
            color: settings.boardColor,
            transparent: true,
            opacity: 0.7,
        });

        board = new THREE.Mesh(geometry, material);
        board.receiveShadow = true;

        board.position.x = 0;
        board.position.y = settings.gameHeight / 2;
        board.position.z = boardSize.depthPos;

        //document.addEventListener('mousemove touchmove', onDocumentMouseMove, false);

        $(document).on("mousemove touchmove", function (e) {
            //log(event);
            onDocumentMouseMove(e);
        });

        scene.add(board);
    }

    function onDocumentMouseMove(event) {
        //event.preventDefault();
        //log(event.originalEvent.touches)

        var clientX = event.originalEvent.touches ? event.originalEvent.touches[0].clientX : event.clientX;
        var clientY = event.originalEvent.touches ? event.originalEvent.touches[0].clientY : event.clientY;
        //log("clientX: " + event.touches[0].clientX + " clientY: " + event.touches[0].clientY);

        var mouse = { x: 0, y: 0 };
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        // Make the board follow the mouse
        var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
        vector.unproject(camera);
        var dir = vector.sub(camera.position).normalize();
        var distance = -camera.position.z / dir.z;
        var pos = camera.position.clone().add(dir.multiplyScalar(distance));

        var boardBorders = new THREE.Box3().setFromObject(planes.front);

        var width = board.geometry.parameters.width * board.scale.x;
        pos.x = Math.min(pos.x, boardBorders.max.x - width / 2);
        pos.x = Math.max(pos.x, boardBorders.min.x + width / 2);

        var height = board.geometry.parameters.height * board.scale.x;
        pos.y = Math.min(pos.y, boardBorders.max.y - height / 2);
        pos.y = Math.max(pos.y, boardBorders.min.y + height / 2);

        pos.z = boardSize.depthPos;
        board.position.copy(pos);
    }

    function initBall() {
        balls = new THREE.Object3D();

        balls.position.x = 0;
        balls.position.y = 0;
        balls.position.z = 0;

        scene.add(balls);

        var radius = settings.brickHeight / 2;

        var newBall = createNewBall();

        balls.add(newBall);
    }

    function createNewBall() {
        var radius = settings.brickHeight / 2;;
        var sphereGeometry = new THREE.SphereGeometry(radius, 10, 10);
        var sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        sphereMaterial.map = loader.load(img.ball)

        var newBall = new THREE.Mesh(sphereGeometry, sphereMaterial);

        newBall.castShadow = true;
        newBall.receiveShadow = true;

        newBall.position.x = 0;
        newBall.position.y = settings.gameHeight / 2;
        newBall.position.z = 0;

        newBall.direction = getDefaultBallDirection();

        return newBall;
    }

    function moveBalls() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];

            ball.position.x += ball.direction.x * ballSpeed;
            ball.position.y += ball.direction.y * ballSpeed;
            ball.position.z += ball.direction.z * ballSpeed;

            ball.rotation.x += 0.01;
            ball.rotation.y += 0.01;
            ball.rotation.z += 0.01;
        }
    }

    function getBallRadius(ball) {
        return ball.geometry.parameters.radius * ball.scale.x;
    }

    function detectBallVsSurface() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];
            var radius = getBallRadius(ball);

            var maxX = settings.gameWidth / 2 - radius;
            var minX = -maxX;

            var maxY = settings.gameHeight - radius;
            var minY = radius;

            var maxZ = settings.gameDepth / 2 - radius;
            var minZ = -maxZ;

            if (ball.position.x > maxX || ball.position.x < minX) {
                ball.direction.x = -ball.direction.x;

                hittedPlane = ball.position.x > maxX ? planes.right : planes.left;
                ballHitPlane(hittedPlane);
            }

            if (ball.position.y > maxY || ball.position.y < minY) {
                ball.direction.y = -ball.direction.y;

                hittedPlane = ball.position.y > maxY ? planes.top : planes.bottom;
                ballHitPlane(hittedPlane);
            }

            if (ball.position.z > maxZ || ball.position.z < minZ) {
                ball.direction.z = -ball.direction.z;

                hittedPlane = ball.position.z > maxZ > maxY ? planes.front : planes.back;
                ballHitPlane(hittedPlane);
            }

            if (ball.position.z > maxZ) {
                balls.remove(ball);

                if (balls.children.length === 0) {
                    ballDead();
                }
            }
        }

    }

    function ballHitPlane(hittedPlane) {
        blinkObject(hittedPlane, settings.surfaceColor, settings.hitColor);
    }

    function ballHitBoard() {
        blinkObject(board, settings.boardColor, settings.hitColor);
    }

    function ballDead() {
        planes.front.visible = true;
        stopBalls();
        initBall();

        showTextMessage("Oops, ball lost", 0x0E07DB)
        bindStartEvent();
    }

    function stopBalls() {
        guiControls.ballSpeed = ballSpeed = 0;
    }

    function startBalls() {
        guiControls.ballSpeed = ballSpeed = settings.gameDepth / 2;
    }

    function toggleBalls() {
        if (ballSpeed === 0) {
            startBalls();
        } else {
            stopBalls();
        }
    }

    function resetBall() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];

            ball.position.x = 0;
            ball.position.y = settings.gameHeight / 2;
            ball.position.z = 0;

            ball.direction = getDefaultBallDirection();
        }
    }

    function detectBallVsBoard() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];

            var boardBorders = new THREE.Box3().setFromObject(board);
            var radius = getBallRadius(ball);

            if (ball.position.z >= boardBorders.min.z - radius && ballSpeed !== 0) {

                if (ball.position.x >= boardBorders.min.x - radius &&
                    ball.position.x <= boardBorders.max.x + radius &&
                    ball.position.y >= boardBorders.min.y - radius &&
                    ball.position.y <= boardBorders.max.y + radius) {

                    ball.direction.z = -ball.direction.z;

                    var offsetX = (ball.position.x - (boardBorders.min.x + (boardSize.width / 2)));
                    var offsetY = (ball.position.y - (boardBorders.min.y + (boardSize.height / 2)));

                    offsetX *= 0.0001;
                    offsetY *= 0.0001;

                    ball.direction.x += offsetX;
                    ball.direction.y += offsetY;

                    ballHitBoard();
                }
            }
        }
    }

    function detectBallVsWall() {
        for (var i = 0; i < balls.children.length; i++) {
            var ball = balls.children[i];

            if (isBallInsideObj(wall, ball)) {
                var brick = getBrickByBall(ball);
                if (brick) {
                    ballHitBrick(brick);
                    ball.direction.z = -ball.direction.z;
                }
            }

        }
    }

    function getBrickByBall(ball) {
        for (var i = 0; i < wall.children.length; i++) {
            var brick = wall.children[i];

            if (isBallInsideObj(brick, ball)) {
                return brick;
            }
        }

        return null;
    }

    function isBallInsideObj(obj, ball) {
        var objSize = new THREE.Box3().setFromObject(obj);
        var radius = getBallRadius(ball);

        if (objSize.min.z <= ball.position.z + radius &&
                objSize.max.z >= ball.position.z - radius) {

            if (objSize.min.x <= ball.position.x + radius &&
                objSize.max.x >= ball.position.x - radius) {

                if (objSize.min.y <= ball.position.y + radius &&
                    objSize.max.y >= ball.position.y - radius) {

                    return true;
                }
            }
        }

        return false;
    }

    function ballHitBrick(brick) {

        createPresentByBrick(brick);

        wall.remove(brick);
        guiControls.ballSpeed = ballSpeed += 1;

        if (wall.children.length === 0) {
            resetBall();
            stopBalls();

            if (level < levels.length) {
                showTextMessage("Nice !", 0x16F529)
                setTimeout(function () {
                    level = level + 1 % levels.length;
                    initNewGame();
                }, 3000)
            } else {
                showTextMessage("You Won !", 0x16F529)
            }

        }
    }

    function createPresentByBrick(hittedBrick) {
        var action = hittedBrick.action;

        if (action) {
            var radius = settings.brickHeight / 2;
            var sphereGeometry = new THREE.SphereGeometry(radius, 10, 10);
            var sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

            present = new THREE.Mesh(sphereGeometry, sphereMaterial);

            sphereMaterial.map = action.imageTexture;
            present.hitCallback = action.hitCallback;

            present.position.x = hittedBrick.position.x;
            present.position.y = hittedBrick.position.y;
            present.position.z = hittedBrick.position.z;

            presents.add(present);
        }

    }

    function initKeyboardEvents() {
        $(document).keydown(function (e) {
            //log(e.which)
            switch (e.which) {
                case 37: // left
                    board.position.x = Math.max(board.position.x - settings.arrowKeyOffset, boardBoundries.minX);
                    break;

                case 38: // up
                    board.position.y = Math.min(board.position.y + settings.arrowKeyOffset, boardBoundries.maxY);
                    break;

                case 39: // right
                    board.position.x = Math.min(board.position.x + settings.arrowKeyOffset, boardBoundries.maxX);
                    break;

                case 40: // down
                    board.position.y = Math.max(board.position.y - settings.arrowKeyOffset, boardBoundries.minY);
                    break;

                case 80: // 'p'
                    toggleBalls();
                    break;

                case 82: // 'r'
                    resetBall();
                    break;

                default: return; // exit this handler for other keys
            }
            e.preventDefault(); // prevent the default action (scroll / move caret)
        });
    }

    function showTextMessage(text, color) {
        if (textMesh === null) {
            createNewTextMesh(text, color);
        } else {
            scene.remove(textMesh);
            createNewTextMesh(text, color);
        }

        var textGeo = textMesh.geometry;
        textGeo.computeBoundingBox();
        textGeo.computeVertexNormals();

        var centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
        textMesh.position.x = centerOffset;

        textMesh.visible = true;
    }

    function createNewTextMesh(text, color) {
        material = new THREE.MultiMaterial([
                   new THREE.MeshPhongMaterial({ color: color, shading: THREE.FlatShading }), // front
                   new THREE.MeshPhongMaterial({ color: color, shading: THREE.SmoothShading }) // side
        ]);

        var textGeo = new THREE.TextGeometry(text, {
            font: font,
            height: 1,
            size: settings.gameWidth / 10,
            curveSegments: 1,
            bevelThickness: 1,
            bevelSize: 0.2,
            bevelEnabled: true,
            material: 0,
            extrudeMaterial: 1
        });

        textMesh = new THREE.Mesh(textGeo, material);

        textMesh.position.y = settings.gameHeight / 2;
        textMesh.position.z = settings.gameDepth / 2;

        textMesh.rotation.x = 0;
        textMesh.rotation.y = Math.PI * 2;

        scene.add(textMesh);
    }

    function movePresents() {
        var maxZ = settings.gameDepth;

        for (var i = 0; i < presents.children.length; i++) {
            var p = presents.children[i];
            p.position.z += 0.2;

            p.rotation.x += 0.01;
            p.rotation.y += 0.01;
            p.rotation.z += 0.01;

            if (p.position.z >= maxZ) {
                presents.remove(p);
            }
        }
    }


    function detectBoardVsPresents() {
        for (var i = 0; i < presents.children.length; i++) {
            var p = presents.children[i];

            var globalPresentPostion = new THREE.Vector3();
            globalPresentPostion.setFromMatrixPosition(p.matrixWorld);

            var boardBorders = new THREE.Box3().setFromObject(board);
            var radius = p.geometry.parameters.radius;

            if (globalPresentPostion.z >= boardBorders.min.z - radius) {

                if (globalPresentPostion.x >= boardBorders.min.x - radius &&
                    globalPresentPostion.x <= boardBorders.max.x + radius &&
                    globalPresentPostion.y >= boardBorders.min.y - radius &&
                    globalPresentPostion.y <= boardBorders.max.y + radius) {

                    presentHitBoard(p);
                }
            }
        }
    }

    function presentHitBoard(present) {
        var p = present;

        if (present.hitCallback) {
            present.hitCallback();
        }

        presents.remove(p);
    }

    function moveBullets() {
        var minZ = -settings.gameDepth;

        for (var i = 0; i < bullets.children.length; i++) {
            var p = bullets.children[i];
            p.position.z -= 0.4;

            p.rotation.x += 0.01;
            p.rotation.y += 0.01;
            p.rotation.z += 0.01;

            if (p.position.z <= minZ) {
                bullets.remove(p);
            }
        }
    }

    function detectBulletsVsWall() {
        for (var i = 0; i < bullets.children.length; i++) {
            var bullet = bullets.children[i];

            if (isBallInsideObj(wall, bullet)) {
                var brick = getBrickByBall(bullet);
                if (brick) {
                    ballHitBrick(brick);

                    bullets.remove(bullet);
                }
            }

        }
    }


    function render() {
        ballSpeed = guiControls.ballSpeed;

        moveBalls();
        if (ballSpeed > 0) {
            detectBallVsSurface();
            detectBallVsBoard();
            detectBallVsWall();
        }

        movePresents();
        if (presents.children.length > 0) {
            detectBoardVsPresents();
        }

        moveBullets();
        if (bullets.children.length > 0) {
            detectBulletsVsWall();
        }

        stats.update();
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    function log(obj) {
        console.log(obj);
    }

})();

dxBall.init();