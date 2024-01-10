/**
 * SQL-TABLE: CEFECTOS_SEL
 *
 * Original: 05-01-2024
 */
function f() {
    <!-- ==================================================================== -->
    <!-- Posible filtro por el campo cterbanc.iban.                           -->
    <!-- ==================================================================== -->
    var sqlCond = Ax.context.filter["SRC_CEFECTOS"] || "1 = 0";

    if (sqlCond.match("cterbanc")) {
        sqlCond += ` AND EXISTS(SELECT b.numero
                                  FROM cefectos b, cterbanc
                                 WHERE b.numero = cefectos.numero
                                   AND b.codper = cterbanc.codigo
                                   AND b.numban = cterbanc.numban
                                   AND ${sqlCond})`
    }

    return Ax.db.executeQuery(`
                <select secure='true' >
                    <columns>
                        DISTINCT
                        cefectos.numero, cefectos.clase,  cefectos.empcode,
                        cefectos.codper, cterper.nombre nomper,
                        cefectos.tercer, ctercero.nombre, cefectos.fecven,
                        CASE WHEN cefectos.clase = 'C' THEN +cefectos.impdiv ELSE -cefectos.impdiv END <alias name='impdiv' />,
                        cefectos.moneda,
                        CASE WHEN cefectos.clase = 'C' THEN +cefectos.import ELSE -cefectos.import END <alias name='import' />,
                        CASE WHEN cefectos.clase = 'C' THEN +cefectos.impppa ELSE -cefectos.impppa END <alias name='impppa' />,
                        cefectos.docser, cefectos.numefe, cefectos.fecha,
                        cefectos.tipefe, cefectos.estado, cefectos.caduca, cefectos.codper, cefectos.numban, cterbanc.iban,
                        CASE WHEN csepadom.estado IS NOT NULL AND csepadom.fecult &gt;= TODAY - 36 UNITS MONTH THEN 3 
                            ELSE NVL(csepadom.estado, 0) 
                        END mandate,       
                        cefectos.ctafin, cefectos.jusser, 
                        cefectos.tipdoc, cefectos.refban,
                        cefectos.proyec, cproyect.nompro,
                        cefectos.seccio, cseccion.nomsec,
                        cefectos.empcode,cefectos.cuenta,
                        cefectos.numges
                    </columns>
                    <from table="cefectos">
                        <join table="cefeacti_est">
                            <on>cefeacti_est.clase  = '${Ax.context.data.clase}'</on>
                            <on>cefeacti_est.codigo = '${Ax.context.data.accion}'</on>
                            <on>cefeacti_est.claori = cefectos.clase</on>
                            <on>cefeacti_est.estori = cefectos.estado</on>
                            <on>(cefeacti_est.efeori IS NULL OR cefeacti_est.efeori = cefectos.tipefe)</on>
                        </join>
                        <join table="ctipoefe">
                            <on>cefectos.clase  = ctipoefe.clase</on>
                            <on>cefectos.tipefe = ctipoefe.codigo</on>
                        </join>                        
                        <join table="cproyect">
                            <on>cefectos.proyec = cproyect.codigo</on>
                        </join>
                        <join table="cseccion">
                            <on>cefectos.seccio = cseccion.codigo</on>
                        </join>
                        <join table="ctercero">
                            <on>cefectos.tercer = ctercero.codigo</on>
                        </join>
                        <join table="ctercero" alias="cterper">
                            <on>cefectos.codper = cterper.codigo</on>
                        </join>                        
                        <join type="left"  table="cterbanc">
                            <on>cefectos.codper = cterbanc.codigo</on>
                            <on>cefectos.numban = cterbanc.numban</on>
                        </join>
                        <join type="left" table="csepadom">
                            <on>cefectos.empcode = csepadom.empcode</on>
                            <on>cefectos.clase   = csepadom.claman</on>         
                            <on>cefectos.tercer  = csepadom.tercer</on>
                            <on>cefectos.numban  = csepadom.numban</on>
                            <on>csepadom.seqno IN (SELECT MAX(a.seqno) 
                                                     FROM csepadom a
                                                    WHERE a.empcode = cefectos.empcode
                                                      AND a.claman  = cefectos.clase
                                                      AND a.tercer  = cefectos.tercer
                                                      AND a.numban  = cefectos.numban)</on>
                        </join>                           
                    </from>
                    <where>
                        NOT (cefectos.numdes > 0 AND cefectos.caduca = 'S')     <!-- Excluye efectos reclasificados                 -->
                        AND cefectos.empcode = '${Ax.context.data.empcode}'     <!-- Excluye otra empresa                           -->
                        AND cefectos.import != 0                                <!-- Excluye efectos con importe cero               -->
                        AND cefectos.numero NOT IN                              <!-- Excluye efectos en otros procesos aún abiertos -->
                         (SELECT d.det_numero
                            FROM cefecges_pcs g, cefecges_det d
                           WHERE g.pcs_empcode = '${Ax.context.data.empcode}'
                             AND g.pcs_fecpro  >= (SELECT MIN(s.fecini) FROM cperiodo s WHERE s.empcode = '${Ax.context.data.empcode}' AND s.estado = 'A')
                             AND g.pcs_seqno   = d.pcs_seqno
                             AND g.pcs_estado  = 'A'
                             AND d.det_numero  = cefectos.numero)
                        <!--     AND cefectos.moneda    = '${Ax.context.data.moneda}'  2023 09 13 CBF  Permitir USD en cta en PEN-->
                        AND ${sqlCond}
                    </where>
                </select>`);
}
