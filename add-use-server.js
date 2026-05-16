const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, 'src/actions');

fs.readdirSync(dir)
  .filter(f => f.endsWith('.ts'))
  .forEach(f => {
    const fp = path.join(dir, f);
    let c = fs.readFileSync(fp, 'utf8');
    if (!c.trimStart().startsWith('"use server"')) {
      fs.writeFileSync(fp, '"use server";\n\n' + c);
      console.log('Added:', f);
    } else {
      console.log('Has:', f);
    }
  });
