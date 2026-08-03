const { z } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        detalhes: result.error.issues.map((i) => ({
          campo: i.path.join('.') || (source === 'body' ? 'corpo' : source),
          mensagem: i.message,
        })),
      });
    }
    req[source] = result.data;
    next();
  };
}

const paginacaoQuery = z.object({
  pagina: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().positive().optional(),
});

const idParams = z.object({ id: z.coerce.number().int().positive() });

module.exports = { validate, paginacaoQuery, idParams };
