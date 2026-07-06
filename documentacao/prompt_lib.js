/**
 * Prompt interativo único — evita dois readline no mesmo stdin (tecla duplicada).
 */
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export function ask(question, { defaultValue = '' } = {}) {
  const hint = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

export function closePrompt() {
  rl.close();
}
