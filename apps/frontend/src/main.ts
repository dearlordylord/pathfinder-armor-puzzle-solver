import type { Runtime } from 'foldkit'

import { Message } from './message'
import { initialModel, Model } from './model'
import { update } from './update'
import { view } from './view'

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  initialModel,
  [],
]

export { Message, Model, update, view }
