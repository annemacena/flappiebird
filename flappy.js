console.log('🥀');

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

function Bird(gameHeight, METER, SECOND, VELOCITY, TICKTIME) {
    let flying = false
    
    let ticks = 0;

    this.impulseY = !matchMedia('screen and (max-width: 600px)').matches ? 30 : 20;
    this.impulseT = 0
    this.previousY = 0
    this.time = 0;

    this.element = newElement('img', 'bird')
    this.element.src = 'bird.png'

    this.position = (t, v0 = 0, p0 = 0) => {
      return (-(12 * METER) * (t * t) / 2 + v0 * t + p0) * METER;
    }

    this.getY = () => {
        let bottom = this.element.style.bottom;
        return !!bottom ? parseInt(this.element.style.bottom.split('px')[0]) : 0;
    }
    this.setY = y => this.element.style.bottom = `${y}px`

    this.animate = () => {
        this.time = ticks * TICKTIME;

        const newY = this.position((this.time - this.impulseT) / SECOND, VELOCITY, this.impulseY);
        const maxHeight = gameHeight - this.element.clientHeight

        if (newY <= 0) {
            if(this.time > 0) this.setY(0)            
            else {
                this.setY(maxHeight / 2)
            }
        } else if (newY >= maxHeight) {
            this.setY(maxHeight)
        } else {
            this.setY(newY)

            let rotation = newY - this.previousY;
            if (rotation < -3)
            rotation = -3;
            this.element.style.transform = `rotate(${-rotation * 15}deg)`;
        }

        ticks++;
        this.previousY = newY;
    }
}

function Progress(bestScoreElem, scoreElem) {
    this.bElement = bestScoreElem
    this.sElement = scoreElem
    this.element = newElement('span', 'progress')

    let bestScore = localStorage.getItem("anz-flappie-bestScore")
    if (!!bestScore && !isNaN(bestScore)) this.bElement.innerHTML = bestScore;

    this.updateScore = score => {
        this.element.innerHTML = score
        this.sElement.innerHTML = score
    }
    this.updateBestScore = score => {
        this.bElement.innerHTML = score
        localStorage.setItem("anz-flappie-bestScore", score)
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

    this.timer = null;

    const FPS = 60,
    SECOND = 1000,
    METER = 10,
    TICKTIME = Number.parseInt(SECOND / FPS),
    VELOCITY = 40;

    let score = 0,
    PAUSED = true;

    const gameArea = document.querySelector('[anz-flappy]'),
    wrap = document.querySelector('[anz-wrap]'),   
    $status = document.getElementById('status');

    gameArea.style.backgroundImage = (new Date()).getHours() > 18 ? "url(bg_night.png)" : "url(bg.png)";

    const progress = new Progress(
                                    wrap.querySelector('div#score h3#best'), 
                                    wrap.querySelector('div#score h2#actual')
                                );

    let height = gameArea.clientHeight,
    width = gameArea.clientWidth,
    barriers = null,
    bird = null;    

    function velocity(t, v0 = 0) {
      return (-(12 * METER) * t + v0) * METER;
    }

    function updateStatus(PAUSED, time, impulseT,impulseP, p, previousP) {
      $status.innerHTML =
          `${PAUSED ? 'PAUSED...' : ''}
        TIME: ${time}s
        VELOCITY: ${velocity(time - impulseT, VELOCITY)}m/s
        POSITION: ${p}y
        MOTION: ${p - previousP}m
        IMPULSE: ${impulseP}m / ${impulseT}s
        `;
    }

    this.start = () => {

        this.reset();
        wrap.style.display = 'none';
        gameArea.classList.remove("paused")
        PAUSED = false;
        updateStatus(PAUSED, bird.time, bird.impulseT, bird.impulseY, bird.getY(), bird.previousY);

        gameArea.onclick  = e => {
            if(!PAUSED){
                bird.impulseY = bird.getY() / METER;
                bird.impulseT = bird.time;
            }
        }
        window.onkeyup = e => {
            if (e.keyCode == 32 && !PAUSED) {
                bird.impulseY = bird.getY() / METER;
                bird.impulseT = bird.time;
            }
        }

        // loop
        timer = setInterval(() => {

            barriers.animate()
            bird.animate()

            if (theyCollided(bird, barriers, height)) {
                let bestScore = localStorage.getItem("anz-flappie-bestScore")
                if (!bestScore || (isNaN(bestScore) || (!isNaN(bestScore) && score > bestScore) ) ) progress.updateBestScore(score)
                PAUSED = true;
                console.log("game over 💀");
                gameArea.classList.add("paused")
                clearInterval(timer)
                wrap.style.display = 'block';
            }

            updateStatus(PAUSED, bird.time, bird.impulseT, bird.impulseY, bird.getY(), bird.previousY);
        }, TICKTIME)

        this.timer = timer;
    }

    this.reset = () => {

        gameArea.classList.add("paused")
        clearInterval(this.timer);

        gameArea.innerHTML = "";
        height = gameArea.clientHeight
        width = gameArea.clientWidth
        score = 0;

        progress.updateScore(0);

        barriers = new Barriers(height, width, 
            !matchMedia('screen and (max-width: 600px)').matches ? 230 : 200, 
            !matchMedia('screen and (max-width: 600px)').matches ? 450 : 350,
            () => progress.updateScore(++score))
        bird = new Bird(height, METER, SECOND, VELOCITY, TICKTIME)

        barriers.pairs.forEach(pair => gameArea.appendChild(pair.element))
        gameArea.appendChild(progress.element)
        gameArea.appendChild(bird.element)

        wrap.style.display = 'block';
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