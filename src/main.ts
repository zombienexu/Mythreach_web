import { mount } from 'svelte'
import './ui/styles/tokens.css'
import './ui/styles/base.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
