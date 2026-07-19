import { extractPlainText } from './lib/search'

function run() {
  const content = [{"id":"7123","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"hello world","styles":{}}],"children":[]}]
  console.log(extractPlainText(content))
}
run()
