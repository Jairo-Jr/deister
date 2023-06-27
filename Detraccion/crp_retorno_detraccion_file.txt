/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 *
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 *
 * -----------------------------------------------------------------------------
 *
 *  JS:  Name Function
 *  Version     : v1.6
 *  Date        : 14-02-2023
 *  Description : Procesa fichero en excel y actualiza el número de constancia del documento fiscal en ctax_move_line.taxl_auxnum1
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_retorno_detraccion              A través de la acción 'ACTION_BTN_RETE'
 *
 *  PARAMETERS:
 *  ==================
 *      @param  {integer}   p_fileid      Número serial del registro de la tabla crp_retorno_detraccion
 *
 **/
function crp_retorno_detraccion_file(p_fileid) {

    // Definicion de variables
    let m_count_update = 0;
    var mStrUserName = Ax.db.getUser();
    var mStrDate = new Ax.util.Date();

    // Busqueda de archivo segun el fileId
    let m_blob = Ax.db.executeQuery(`
        SELECT file_status, file_data, file_type, user_updated
          FROM crp_retorno_detraccion
         WHERE file_seqno = ?
    `, p_fileid).toOne();

    if (m_blob.file_status == 'P') {    // Si el fichero se encuentra en estado 'P' (Pendiente)
        try {
            /**
             * SCRIPT PARA LEER ARCHIVOS CSV - TXT
             */
            var blob = new Ax.sql.Blob();
            blob.setContent(m_blob.file_data);

            var rs = new Ax.rs.Reader().csv(options => {
                options.setBlob(blob);
                options.setDelimiter("|");
                options.setHeader(true);
                options.setQuoteChar(7);
                options.setCharset("ISO-8859-15");

                // Definición de tipo de datos a columnas
                options.setColumnType("Numero de Comprobante",  Ax.sql.Types.CHAR);
                options.setColumnType("Serie de Comprobante",  Ax.sql.Types.CHAR);

            })

            console.log(rs);
            rs.forEach(m_arr => {
                var numconstancia  = m_arr['Numero Constancia'];
                var sericomponente = m_arr['Serie de Comprobante'];
                var numcomponente  = m_arr['Numero de Comprobante'];
                var docser = sericomponente + '-' + numcomponente;

                var ctax_move_line_seqno = Ax.db.executeGet(`
                        <select>
                            <columns>
                                ctax_move_line.taxl_seqno
                            </columns>
                            <from table='gvenfach'>
                                <join table='capuntes'>
                                    <on>gvenfach.loteid = capuntes.loteid</on>
                                    <join table='ctax_move_head'>
                                        <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
                                        <join table='ctax_move_line'>
                                            <on>ctax_move_head.taxh_seqno  = ctax_move_line.taxh_seqno</on>
                                        </join>
                                    </join>
                                </join>
                            </from>
                            <where>
                                ctax_move_line.taxl_type = 'D'
                                AND gvenfach.docser = ?
                            </where>
                        </select>
                    `, docser);

                var res =
                    Ax.db.update(`ctax_move_line`,
                        {
                            taxl_auxnum1  : numconstancia
                        },
                        {
                            taxl_seqno: ctax_move_line_seqno
                        }
                    );

                if (res.count !== 0) {m_count_update++}

            })

        } catch (error) {
            // Error al procesar el fichero
            console.error(error);
            throw new Ax.ext.Exception("Error al procesar el fichero: [${error}].", { error });
        }
    } else {
        throw new Ax.ext.Exception('',   `Solo permite la carga de ficheros en estado Pendiente: '${m_blob.file_status}'`);
    }

    if (m_count_update > 0) {
        // Si se realizaron updates, se actualiza a estado Cargado [C]
        Ax.db.update('crp_retorno_detraccion', { file_status: 'C', user_updated: mStrUserName, date_updated: mStrDate}, { file_seqno: p_fileid });
    } else {
        // Si no hubo update alguno, se cambia el estado a Error [E]
        Ax.db.update('crp_retorno_detraccion', { file_status: 'E', user_updated: mStrUserName, date_updated: mStrDate}, { file_seqno: p_fileid });
    }
    return m_count_update;
}