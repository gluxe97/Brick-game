import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere, useTexture, Center, Text } from '@react-three/drei';
//import { useGesture } from '@react-three/fiber'; // While we use keyboard, this is good to have for potential touch controls


const BRICK_ROWS = 5;
const BRICK_COLUMNS = 7;
const BRICK_WIDTH = 1;
const BRICK_HEIGHT = 0.4;
const BRICK_DEPTH = 0.3;
const BRICK_GAP = 0.1;
const BRICK_OFFSET_X = -(BRICK_COLUMNS * (BRICK_WIDTH + BRICK_GAP)) / 2 + (BRICK_WIDTH + BRICK_GAP) / 2;
const BRICK_OFFSET_Y = 2;

const PADDLE_WIDTH = 2;
const PADDLE_HEIGHT = 0.2;
const PADDLE_DEPTH = 0.5;
const PADDLE_SPEED = 0.3;

const BALL_RADIUS = 0.08;
const BALL_SPEED_INITIAL = { x: 0.02, y: 0.05, z: 0 };

const Paddle = forwardRef(({ position, setPosition }, ref) => {

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                setPosition((prev) => [Math.max(prev[0] - PADDLE_SPEED, -4 + PADDLE_WIDTH / 2), prev[1], prev[2]]);
            } else if (e.key === 'ArrowRight') {
                setPosition((prev) => [Math.min(prev[0] + PADDLE_SPEED, 4 - PADDLE_WIDTH / 2), prev[1], prev[2]]);
            }
            
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setPosition]);

    return (
        <Box
            ref={ref}
            position={position}
            args={[PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH]}
            material-color="#00a8e8"
        />
    );
  }
)

function Ball({ position, velocity, setVelocity, bricks, setBricks, setScore, gameOver, setGameOver, paddleRef }) {
    const ballRef = useRef();

    useFrame(() => {
        if (gameOver) return;

        ballRef.current.position.x += velocity.x;
        ballRef.current.position.y += velocity.y;
        ballRef.current.position.z += velocity.z;

        

        // Wall collisions (left/right)
        if (Math.abs(ballRef.current.position.x) > 4 - BALL_RADIUS) {
            setVelocity((prev) => ({ ...prev, x: -prev.x }));
        }

        // Wall collision (top)
        if (ballRef.current.position.y > 3 - BALL_RADIUS) {
            setVelocity((prev) => ({ ...prev, y: -prev.y }));
        }

        // Wall collision (bottom - game over)
        if (ballRef.current.position.y < -2 - BALL_RADIUS) {
            setGameOver(true);
            setVelocity({ x: 0, y: 0, z: 0 });
            return;
        }

        // Paddle collision
        const paddleY = -2 + PADDLE_HEIGHT / 2 + BALL_RADIUS;
        if (ballRef.current.position.y < paddleY &&
            ballRef.current.position.y > -2 - BALL_RADIUS &&
            ballRef.current.position.x > -PADDLE_WIDTH / 2 + paddleRef.current.position.x - BALL_RADIUS &&
            ballRef.current.position.x < PADDLE_WIDTH / 2 + paddleRef.current.position.x + BALL_RADIUS) {
            setVelocity((prev) => ({ ...prev, y: -prev.y }));
            // Adjust horizontal velocity based on where the ball hits the paddle
            //const relativeIntersectX = ballRef.current.position[0] - paddleRef.current.position[0];
            //const normalizedIntersectX = relativeIntersectX / (PADDLE_WIDTH / 2);
            setVelocity((prev) => ({ ...prev, x:  prev.x}));
        }
       console.log("paddleY:", paddleY);
       console.log("ballRef:", ballRef.current.position);
       console.log("paddleRef:", paddleRef.current.position);

        // Brick collision
        const newBricks = [...bricks];
        let collision = false;
        for (let i = 0; i < newBricks.length; i++) {
            const brick = newBricks.flat()[i];
            if (brick && brick.status === 1) {
                const brickMinX = brick.x - BRICK_WIDTH / 2;
                const brickMaxX = brick.x + BRICK_WIDTH / 2;
                const brickMinY = brick.y - BRICK_HEIGHT / 2;
                const brickMaxY = brick.y + BRICK_HEIGHT / 2;
                const brickMinZ = brick.z - BRICK_DEPTH / 2;
                const brickMaxZ = brick.z + BRICK_DEPTH / 2;

                const ballX = ballRef.current.position.x;
                const ballY = ballRef.current.position.y;
                const ballZ = ballRef.current.position.z;

                if (ballX > brickMinX - BALL_RADIUS && ballX < brickMaxX + BALL_RADIUS &&
                    ballY > brickMinY - BALL_RADIUS && ballY < brickMaxY + BALL_RADIUS &&
                    ballZ > brickMinZ - BALL_RADIUS && ballZ < brickMaxZ + BALL_RADIUS) {
                    newBricks.flat()[i].status = 0;
                    setBricks(newBricks);
                    setScore((prev) => prev + 10);
                    collision = true;

                    // Determine collision side for more realistic bounce (simplified)
                    const deltaX = Math.abs(ballX - (brick.x));
                    const deltaY = Math.abs(ballY - (brick.y));

                    if (deltaX > deltaY) {
                        setVelocity((prev) => ({ ...prev, x: -prev.x }));
                    } else {
                        setVelocity((prev) => ({ ...prev, y: -prev.y }));
                    }
                    break; // Only one brick can be hit at a time (for simplicity)
                }
            }
        }

        if (bricks.flat().every(brick => !brick || brick.status === 0) && !gameOver) {
            setGameOver(true);
            setVelocity({ x: 0, y: 0, z: 0 });
        }
    });

    return (
        <Sphere ref={ballRef} position={position} args={[BALL_RADIUS, 32, 32]} material-color="#fca311" />
    );
}

function Bricks({ initialBricks }) {
    return (
        <>
            {initialBricks.flat().map((brick, index) => (
                brick && brick.status === 1 && (
                    <Box
                        key={index}
                        position={[brick.x, brick.y, brick.z]}
                        args={[BRICK_WIDTH, BRICK_HEIGHT, BRICK_DEPTH]}
                        material-color={brick.color}
                    />
                )
            ))}
        </>
    );
}

function Game() {
    const [paddlePosition, setPaddlePosition] = useState([0, -2, 0]);
    const [ballPosition, setBallPosition] = useState([0, -1, 0]);
    const [ballVelocity, setBallVelocity] = useState(BALL_SPEED_INITIAL);
    const [bricks, setBricks] = useState([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const paddleRef = useRef();


    useEffect(() => {
        resetGame();
    }, []);

    const initializeBricks = () => {
        const initialBricks = [];
        const colors = ["#e63946", "#f1faee", "#a8dadc", "#457b9d", "#1d3557"];
        for (let r = 0; r < BRICK_ROWS; r++) {
            const row = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                row.push({
                    x: BRICK_OFFSET_X + c * (BRICK_WIDTH + BRICK_GAP),
                    y: BRICK_OFFSET_Y - r * (BRICK_HEIGHT + BRICK_GAP),
                    z: 0,
                    status: 1,
                    color: colors.at(r % colors.length),
                });
            }
            initialBricks.push(row);
        }
        setBricks(initialBricks.flat());
    };

    const resetGame = () => {
        setPaddlePosition([0, -2, 0]);
        setBallPosition([0, -1, 0]);
        setBallVelocity(BALL_SPEED_INITIAL);
        initializeBricks();
        setScore(0);
        setGameOver(false);
        setGameStarted(false);
    };
      
    const startGame = () => {
        if (!gameStarted) {
            setBallVelocity(BALL_SPEED_INITIAL);
            setGameStarted(true);
        } else {
            resetGame();
            setGameStarted(true);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={0.8} />
                <Paddle position={paddlePosition} setPosition={setPaddlePosition} ref={paddleRef} />
                <Ball
                    position={ballPosition}
                    velocity={ballVelocity}
                    setVelocity={setBallVelocity}
                    bricks={bricks}
                    setBricks={setBricks}
                    setScore={setScore}
                    gameOver={gameOver}
                    setGameOver={setGameOver}
                    paddleRef={paddleRef}
                />
                <Bricks initialBricks={bricks} />
                {/* Walls */}
                <Box position={[0, 3.5, 0]} args={[8, 1, 0.1]} material-color="#4a4e69" /> {/* Top */}
                <Box position={[0, -3.5, 0]} args={[8, 1, 0.1]} material-color="#4a4e69" /> {/* Bottom */}
                <Box position={[-4.5, 0, 0]} args={[1, 7, 0.1]} material-color="#4a4e69" /> {/* Left */}
                <Box position={[4.5, 0, 0]} args={[1, 7, 0.1]} material-color="#4a4e69" />  {/* Right */}
            </Canvas>
            <div style={{ position: 'absolute', top: 20, left: 20, color: '#e0e0e0', fontFamily: 'monospace', fontSize: '1.2em' }}>
                Score: {score}
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    padding: 20,
                    borderRadius: 8,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '1.5em',
                    display: gameOver ? 'block' : 'none',
                }}
            >
                {bricks.flat().every(brick => !brick || brick.status === 0) ? (
                    <>
                        <p>You Win!</p>
                        <button onClick={resetGame} style={buttonStyle}>Play Again</button>
                    </>
                ) : (
                    <>
                        <p>Game Over</p>
                        <button onClick={resetGame} style={buttonStyle}>Try Again</button>
                    </>
                )}
            </div>
            {!gameStarted && !gameOver && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        padding: 20,
                        borderRadius: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: '1.5em',
                    }}
                >
                    <p>Press Space or Click to Start</p>
                    <button onClick={startGame} style={buttonStyle}>Start Game</button>
                </div>
            )}
        </div>
    );
}

const buttonStyle = {
    padding: '10px 20px',
    fontSize: '1em',
    fontFamily: 'monospace',
    backgroundColor: '#fca311',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '10px',
};

function App() {
    return <Game />;
}

export default App;



