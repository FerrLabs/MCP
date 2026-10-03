export const SECRET_REVEAL_ENV = 'FERRLABS_MCP_ALLOW_TOKEN_REVEAL';

export type SecretRevealRefusal = {
  isError: true;
  content: [{ type: 'text'; text: string }];
};

interface RefusalOptions {
  action: string;
  instead: string;
}

interface RevealOptions {
  label: string;
  secret: string;
  revokeTool: string;
  details: string;
}

export function secretRevealRefusal({
  action,
  instead,
}: RefusalOptions): SecretRevealRefusal | null {
  if (process.env[SECRET_REVEAL_ENV] === '1') return null;
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: [
          `Refusing to ${action}.`,
          '',
          'The secret is returned exactly once, at creation, so this tool would have to put it in its response, and tool results are written to the conversation transcript, which the client persists to disk and may ship in logs or telemetry. A long-lived credential would end up in places you did not choose.',
          '',
          `${instead} instead.`,
          '',
          `If you accept the exposure, restart the MCP server with ${SECRET_REVEAL_ENV}=1. It is an environment variable rather than an argument on purpose: the decision belongs to whoever runs the server.`,
        ].join('\n'),
      },
    ],
  };
}

export function revealedSecretText({ label, secret, revokeTool, details }: RevealOptions): string {
  return `${label}: ${secret}\n\nThis is the only time the secret is shown, and it is now in this transcript. Move it to your secret store, then treat the transcript as sensitive or revoke it with ${revokeTool}.\n\n${details}`;
}
