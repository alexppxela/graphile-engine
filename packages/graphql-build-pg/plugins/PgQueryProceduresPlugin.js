const makeProcField = require("./makeProcField");

module.exports = function PgQueryProceduresPlugin(
  builder,
  { pgInflection: inflection, pgStrictFunctions: strictFunctions = false }
) {
  builder.hook(
    "objectType:fields",
    (
      fields,
      {
        getTypeByName,
        extend,
        pgIntrospectionResultsByKind: introspectionResultsByKind,
        pgSql: sql,
        pgGqlTypeByTypeId: gqlTypeByTypeId,
        pgGqlInputTypeByTypeId: gqlInputTypeByTypeId,
      },
      { scope: { isRootQuery }, buildFieldWithHooks }
    ) => {
      if (!isRootQuery) {
        return fields;
      }
      return extend(
        fields,
        introspectionResultsByKind.procedure
          .filter(proc => proc.isStable)
          .reduce((memo, proc) => {
            /*
            proc =
              { kind: 'procedure',
                name: 'integration_webhook_secret',
                description: null,
                namespaceId: '6484381',
                isStrict: false,
                returnsSet: false,
                isStable: true,
                returnTypeId: '2950',
                argTypeIds: [ '6484569' ],
                argNames: [ 'integration' ],
                argDefaultsNum: 0 }
            */
            const argTypes = proc.argTypeIds.map(
              typeId => introspectionResultsByKind.typeById[typeId]
            );
            if (argTypes.some(type => type.type === "c")) {
              // It operates on classes, skip (maybe it's a computed function?)
              return memo;
            }

            const fieldName = inflection.functionName(
              proc.name,
              proc.namespace.name
            );
            memo[fieldName] = buildFieldWithHooks(
              fieldName,
              makeProcField(proc, {
                introspectionResultsByKind,
                strictFunctions,
                gqlTypeByTypeId,
                gqlInputTypeByTypeId,
                getTypeByName,
                inflection,
              })
            );
            return memo;
          }, {})
      );
    }
  );
};
