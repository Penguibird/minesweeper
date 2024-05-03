/** @jsxImportSource @emotion/react */
// import { jsx, css } from '@emotion/react'
import * as React from 'react';
import styled from '@emotion/styled';
import flagAsset from './assets/flag.png'
import { produce } from 'immer';

interface AppProps extends Omit<React.ComponentProps<typeof Wrapper>, ''> {

};

const HEIGHT = 16
const WIDTH = 30
const MINES = 99

type Mine = 'hidden' | 'revealed' | 'mine' | 'flag-mine' | 'flag-empty'

const initializeMines = () => {
  let mines = Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, _ => 'hidden')) as Mine[][];

  while (mines.flat().reduce((a, v) => v == 'mine' ? a + 1 : a, 0) < MINES) {
    const a = Math.floor(Math.random() * HEIGHT)
    const b = Math.floor(Math.random() * WIDTH);
    if (mines[a][b] != 'mine') {
      mines[a][b] = 'mine'
    }
  }

  return mines
}
type Mines = Mine[][]
const getNeighbors = (i: number, j: number, x?: boolean): [number, number][] => {
  let neighbors = [
    [i - 1, j],
    [i + 1, j],
    [i, j - 1],
    [i, j + 1],
  ]


  if (x) {
    neighbors = [...neighbors,
    [i - 1, j + 1],
    [i + 1, j + 1],
    [i - 1, j - 1],
    [i + 1, j - 1],
    ]
  }

  return neighbors.filter(([i, j]) => i >= 0 && j >= 0 && i < HEIGHT && j < WIDTH) as any;
}

const getMineCount = (m: Mines, i: number, j: number): number => {
  return getNeighbors(i, j, true).reduce((a, [i, j]) => m[i][j] == 'mine' || m[i][j] == 'flag-mine' ? a + 1 : a, 0)
}
const revealMine = (m: Mines, i: number, j: number): Mines => {
  m[i][j] = 'revealed'



  if (getMineCount(m, i, j) == 0) {
    getNeighbors(i, j, true).forEach(([i, j]) => {
      if (getMineCount(m, i, j) == 0 && m[i][j] == 'hidden') {
        m = revealMine(m, i, j);
      }
    })
    getNeighbors(i, j, true).forEach(([i, j]) => {
      if (m[i][j] == 'hidden') {
        m[i][j] = 'revealed';
      }
    })
  }


  return m
}

const isCellHidden = (m: Mine) => m == 'hidden' || m.includes('flag') || m == 'mine'

const nextMove = (m: Mines, setMines: React.Dispatch<React.SetStateAction<Mine[][]>>) => {

  // 1. Flag everything
  let cellsToFlag = [] as [number, number][]
  m.forEach((row, i) => row.forEach((mine, j) => {
    if (mine == 'revealed') {
      if (getMineCount(m, i, j) == getNeighbors(i, j, true).reduce((a, [i, j]) => isCellHidden(m[i][j]) ? a + 1 : a, 0)) {
        let c = getNeighbors(i, j, true).filter(([i, j]) => isCellHidden(m[i][j]) && !m[i][j].includes('flag') && !cellsToFlag.some(c => c[0] == i && c[1] == j))
        cellsToFlag.push(...c);
        return;
      }
    }
  }))

  if (cellsToFlag.length > 0) {
    setMines(produce(m => {
      cellsToFlag.forEach(([i, j]) => m[i][j] = flag(m[i][j])!)
    }))
    return;
  }

  // 2. reveal everything

  let cellsToPop = [] as [number, number][]
  m.forEach((row, i) => row.forEach((mine, j) => {
    if (mine == 'revealed') {
      if (getMineCount(m, i, j) == getNeighbors(i, j, true).reduce((a, [i, j]) => m[i][j].includes('flag') ? a + 1 : a, 0)) {
        let c = getNeighbors(i, j, true).filter(([i, j]) => isCellHidden(m[i][j]) && !m[i][j].includes('flag') && !cellsToPop.some(c => c[0] == i && c[1] == j))
        cellsToPop.push(...c);
        return;
      }
    }
  }))

  if (cellsToPop.length > 0) {
    setMines(produce(m => {
      cellsToPop.forEach(([i, j]) => m = revealMine(m, i, j))
    }))
    return;
  }

  // 3. Tree search

  // 4. Guess / Calculatedly guess
}

const App: React.FC<AppProps> = ({ ...props }) => {
  const [mines, setMines] = React.useState(initializeMines())

  React.useEffect(() => {
    if (isVictory(mines)) {
      alert('VICTORY')
    }
  }, [mines])

  React.useLayoutEffect(() => {
    nextMove(mines, setMines)
  }, [mines])

  React.useEffect(() => {
    if (mines.flat().every(m => m == 'hidden' || m == 'mine')) {
      const i = Math.floor(HEIGHT / 2);
      const starts: (number | null)[] = mines[i].map((n, j) => (n == 'hidden' && getMineCount(mines, i, j) == 0) ? i : null).filter(Boolean)
      if (!starts.length) {
        setMines(initializeMines())
        return;
      }
      const j = starts[Math.floor(Math.random() * starts.length)]!;
      setMines(produce(m => m = revealMine(m, i, j)))
    }
  }, [mines])

  return <Wrapper {...props}>
    Mines: {mines.flat().reduce((a, v) => v.includes('flag') ? a + 1 : a, 0)}
    <button onClick={() => setMines(initializeMines())}>Restart</button>
    <Container>
      {mines.map((row, i) => <Row key={i}>
        {row.map((m, j) => <Mine key={j}
          onContextMenu={(e) => {
            e.preventDefault()
            let newState: Mine | null = flag(m);
            if (!newState) return;
            setMines(produce(m => { m[i][j] = newState! }))
          }}
          onClick={(e) => {
            if (m == 'mine') {
              alert("game over")
            }
            if (m == 'hidden') {
              setMines(produce(m => revealMine(m, i, j)))
            }
          }}
        >
          {m == 'revealed' ? getMineCount(mines, i, j) :
            <MineImage m={m} />
          }
        </Mine>)}
      </Row>)}
    </Container>
  </Wrapper>
}
interface MineImageProps extends Omit<React.ComponentProps<typeof Wrapper>, ''> {
  m: Mine
};

const MineImage: React.FC<MineImageProps> = ({ m, ...props }) => {
  if (m == 'revealed') {
    return
  }
  if (m == 'flag-empty' || m == 'flag-mine') {
    return <img src={flagAsset} />
  }
  if (m == 'mine' || m == 'hidden') {
    return <div css={{ backgroundColor: 'lightgray' }} />
  }
}

const flag = (m: Mine): Mine | null => {
  let newState: Mine | null = null
  if (m == 'flag-empty') {
    newState = 'hidden'
  }
  if (m == 'flag-mine') {
    newState = 'mine'
  }
  if (m == 'mine') {
    newState = 'flag-mine'
  }
  if (m == 'hidden') {
    newState = 'flag-empty'
  }
  return newState;
}


const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 2rem;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 2px;
  border: 2px solid black;
  background-color: #424242;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 2px;
`

const Mine = styled.button`
  border: none;
  padding: 0;
  margin: 0;
  box-shadow: none;
  background-color: #808080;
  border-radius: 0;

  height: 24px;
  aspect-ratio: 1;

  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  * {
    height: 100%;
  }
  cursor: pointer;
  gap: 0;

  color: navy;
  font-weight: 900;
  font-size: 20px;
  font-family: 'Courier New', Courier, monospace;
`

export default App;
function isVictory(mines: Mine[][]) {
  return mines.flat().every(m => m != 'hidden' && m != 'flag-empty');
}

