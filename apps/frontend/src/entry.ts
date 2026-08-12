import { Runtime } from 'foldkit'

import './index.css'
import './App.css'
import './components/GameBoard.css'
import './components/Controls.css'
import { Message, Model, init, update, view } from './main'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Missing application container: #root')
}

Runtime.run(
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container,
    devTools: { Message },
  }),
)
