function newElement(tagName, className) {
    const elem = document.createElement(tagName)
    elem.className = className
    return elem
}

function Barrier(reverse = false) {
    this.element = newElement('div', 'barrier')

    const border = newElement('div', 'border')
    const body = newElement('div', 'body')
    this.element.appendChild(reverse ? body : border)
    this.element.appendChild(reverse ? border : body)

    this.setHeight = height => body.style.height = `${height}px`
}

function BarrierPairs(height, gap, x) {
    this.element = newElement('div', 'barrier-pairs')

    this.higher = new Barrier(true)
    this.lower = new Barrier(false)

    this.element.appendChild(this.higher.element)
    this.element.appendChild(this.lower.element)

    this.drawGap = () => {
        const higherHeight = Math.random() * (height - gap)
        const lowerHeight = height - gap - higherHeight
        this.higher.setHeight(higherHeight)
        this.lower.setHeight(lowerHeight)
    }

    this.getX = () => parseInt(this.element.style.left.split('px')[0])
    this.setX = x => this.element.style.left = `${x}px`
    this.getHeight = () => this.element.clientWidth

    this.drawGap()
    this.setX(x)
}

function Barriers(height, width, gap, barrierGap, notifyScore) {
    this.pairs = [
        new BarrierPairs(height, gap, width),
        new BarrierPairs(height, gap, width + barrierGap),
        new BarrierPairs(height, gap, width + barrierGap * 2),
        new BarrierPairs(height, gap, width + barrierGap * 3)
    ]

    const pixelTick = 3
    this.animate = () => {
        this.pairs.forEach(pair => {
            pair.setX(pair.getX() - pixelTick)

            // when element left game area
            if (pair.getX() < -pair.getHeight()) {
                pair.setX(pair.getX() + barrierGap * this.pairs.length)
                pair.drawGap()
            }

            const middle = width / 2
            const middleCrossed = pair.getX() + pixelTick >= middle
                && pair.getX() < middle
            if(middleCrossed) notifyScore()
        })
    }
}

function Bird(gameHeight) {
    let flying = false

    this.element = newElement('img', 'bird')
    this.element.src = 'bird.png'

    this.getY = () => parseInt(this.element.style.bottom.split('px')[0])
    this.setY = y => this.element.style.bottom = `${y}px`

    window.onkeydown = e => flying = true
    window.onkeyup = e => flying = false

    this.animate = () => {
        const newY = this.getY() + (flying ? 8 : -5)
        const maxHeight = gameHeight - this.element.clientHeight

        if (newY <= 0) {
            this.setY(0)
        } else if (newY >= maxHeight) {
            this.setY(maxHeight)
        } else {
            this.setY(newY)
        }
    }

    this.setY(gameHeight / 2)
}

function Progress() {
    this.element = newElement('span', 'progress')
    this.updateScore = score => {
        this.element.innerHTML = score
    }
    this.updateScore(0)
}

function isCrossed(elementA, elementB) {
    const a = elementA.getBoundingClientRect()
    const b = elementB.getBoundingClientRect()

    const horizontal = a.left + a.width >= b.left
        && b.left + b.width >= a.left
    const vertical = a.top + a.height >= b.top
        && b.top + b.height >= a.top
    return horizontal && vertical
}

function theyCollided(bird, barriers, gameAreaH) {

    if(!bird.getY() || (gameAreaH <= bird.getY()+bird.element.height)) return true;

    let crash = false
    barriers.pairs.forEach(BarrierPairs => {
        if (!crash) {
            const higher = BarrierPairs.higher.element
            const lower = BarrierPairs.lower.element
            crash = isCrossed(bird.element, higher)
                || isCrossed(bird.element, lower)
        }
    })
    return crash
}

function FlappyBird() {
    let score = 0

    const gameArea = document.querySelector('[anz-flappy]')
    const btnStart = document.getElementById('start')
    const progress = new Progress()

    let height = gameArea.clientHeight
    let width = gameArea.clientWidth
    let barriers = null;
    let bird = null;


    this.start = () => {

        this.reset();
        btnStart.style.display = 'none';
        gameArea.classList.remove("paused")

        // loop
        const timer = setInterval(() => {
            barriers.animate()
            bird.animate()

            if (theyCollided(bird, barriers, height)) {
                console.log("game over 💀");
                gameArea.classList.add("paused")
                clearInterval(timer)
                btnStart.style.display = 'block';
            }
        }, 20)
    }

    this.reset = () => {

        gameArea.innerHTML = "";
        height = gameArea.clientHeight
        width = gameArea.clientWidth
        score = 0;

        progress.updateScore(0);


        barriers = new Barriers(height, width, 200, !matchMedia('screen and (max-width: 600px)').matches ? 400 : 250,
            () => progress.updateScore(++score))
        bird = new Bird(height)

        barriers.pairs.forEach(pair => gameArea.appendChild(pair.element))
        gameArea.appendChild(progress.element)
        gameArea.appendChild(bird.element)

        btnStart.style.display = 'block';
    }
}

(function() {
   
    const btnStart = document.getElementById('start');
    const main = new FlappyBird();

    window.addEventListener("resize", function(){
        main.reset();
    });

    btnStart.onclick = function(e) {
        main.start();
    };

})();