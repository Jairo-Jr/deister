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
 * "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication 
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
 *  -----------------------------------------------------------------------------
 *  JS: pe_sunat_padron_reader_padron
 *      Version:    V1.0
 *      Date:       2022.02.25                                          
 *      Description: Carga los padrones de SUNAT mediante rsReader
 * 
 * 
 */
 function pe_sunat_padron_reader_padron(pIntFileId) {
    var mObjFilePadron = Ax.db.executeQuery(`
        <select>
            <columns>
                pe_sunat_padron_file.file_id,
                pe_sunat_padron_file.file_source,
                CASE WHEN pe_sunat_padron_file.file_source = 'BC'  THEN 'pe_sunat_padron_buen_contrib'
                     WHEN pe_sunat_padron_file.file_source = 'AR'  THEN 'pe_sunat_padron_agente_retenc'
                     WHEN pe_sunat_padron_file.file_source = 'AP'  THEN 'pe_sunat_padron_agente_percep'
                     WHEN pe_sunat_padron_file.file_source = 'APV' THEN 'pe_sunat_padron_agente_percep_venta_interna'
                     WHEN pe_sunat_padron_file.file_source = 'EEP' THEN 'pe_sunat_padron_excepcion_percep'
                     WHEN pe_sunat_padron_file.file_source = 'CNA' THEN 'pe_sunat_padron_no_detraccion'
                     WHEN pe_sunat_padron_file.file_source = 'OEE' THEN 'pe_sunat_padron_obliga_emie'
                     WHEN pe_sunat_padron_file.file_source = 'CRE' THEN 'pe_sunat_padron_renuncia_exonera'
                     WHEN pe_sunat_padron_file.file_source = 'NHB' THEN 'pe_sunat_padron_nohabido'
                     WHEN pe_sunat_padron_file.file_source = 'NHL' THEN 'pe_sunat_padron_nohallado'
                     ELSE ''
                 END <alias name='file_table' />,
                 pe_sunat_padron_file.file_status,
                pe_sunat_padron_file.file_data
            </columns>
            <from table="pe_sunat_padron_file"/>
            <where>
                pe_sunat_padron_file.file_id = ?
            </where>
        </select>
    `, pIntFileId).toOne();

    if (mObjFilePadron.file_id == null) {
        throw new Ax.ext.Exception("El fichero [${id}] no existe en el repositorio de padrones", { id: pIntFileId });
    } else if (mObjFilePadron.file_status != 'P') {
        throw new Ax.ext.Exception("Solo permite carga de ficheros en estado pendiente. El fichero [${id}] se encuentra en estado [${status}]", { id: pIntFileId, status: mObjFilePadron.file_status });
    }

    var blob = new Ax.sql.Blob();
    blob.setContent(mObjFilePadron.file_data);

    switch (mObjFilePadron.file_source) {
        case 'BC': case 'AR': case 'AP': case 'APV': case 'CRE':
            var rs = new Ax.rs.Reader().csv(options => {
                options.setBlob(blob);
                options.setDelimiter("|");
                options.setHeader(true);
                options.setQuoteChar(7);
                options.setCharset("ISO-8859-15");
                options.setColumnNameMapping(["pad_ruc", "pad_nomb", "pad_fecini", "pad_numres", "seqno"]);
                //options.getFormats().setParser("pad_fecobl", Ax.rs.DataParser.ofSQLDate("MM/dd/yyyy"));
                options.setColumnFilterMap("seqno", (src) => 0);
            })
                .cols().add("file_id", Ax.sql.Types.INTEGER, fileId => mObjFilePadron.file_id)
                //.cols().add("seqno", Ax.sql.Types.INTEGER, seqno => 0)
                .writer().db(options => {
                    options.setConnection(Ax.db.getObject());
                    options.setTableName(mObjFilePadron.file_table);
                    options.setErrorHandler(error => {
                        throw "Error en la fila: " + error.getRow() + "\n" +
                        "Erro de Tipo: " + error.getType() + "\n" +
                        "Error en el dato: " + error.getData() + "\n" +
                        "Código de error: " + error.getErrorCode() + "\n" +
                        "Mensaje del error: " + error.getMessage();
                    });
                });
            break;
        case 'OEE':
            var rs = new Ax.rs.Reader().csv(options => {
                options.setBlob(blob);
                options.setDelimiter("|");
                options.setHeader(true);
                options.setQuoteChar(7);
                options.setCharset("ISO-8859-15");
                options.setColumnNameMapping(["pad_ruc", "pad_nomb", "pad_comprpag", "pad_descrpag", "pad_numres", "pad_fecobl"]);
                options.getFormats().setParser("pad_fecobl", Ax.rs.DataParser.ofSQLDate("MM/dd/yyyy"));
                //options.setColumnFilterMap("seqno", (src) => 0);
            })
                .cols().add("file_id", Ax.sql.Types.INTEGER, fileId => mObjFilePadron.file_id)
                .cols().add("seqno", Ax.sql.Types.INTEGER, seqno => 0)
                .writer().db(options => {
                    options.setConnection(Ax.db.getObject());
                    options.setTableName(mObjFilePadron.file_table);
                    options.setErrorHandler(error => {
                        throw "Error en la fila: " + error.getRow() + "\n" +
                        "Error de Tipo: " + error.getType() + "\n" +
                        "Error en el dato: " + error.getData() + "\n" +
                        "Código de error: " + error.getErrorCode() + "\n" +
                        "Mensaje del error: " + error.getMessage();
                    });
                });
            break;
        case 'NHB':
            var rs = new Ax.rs.Reader().csv(options => {
                options.setBlob(blob);
                options.setDelimiter("|");
                options.setHeader(false);
                options.setQuoteChar(7);
                options.setCharset("ISO-8859-15");
                options.setColumnNameMapping(["pad_ruc", "pad_nomb", "pad_fecini", "seqno"]);
                //options.getFormats().setParser("pad_fecobl", Ax.rs.DataParser.ofSQLDate("MM/dd/yyyy"));
                options.setColumnFilterMap("seqno", (src) => 0);
            })
                .cols().add("file_id", Ax.sql.Types.INTEGER, fileId => mObjFilePadron.file_id)
                //.cols().add("seqno", Ax.sql.Types.INTEGER, seqno => 0)
                .writer().db(options => {
                    options.setConnection(Ax.db.getObject());
                    options.setTableName(mObjFilePadron.file_table);
                    options.setErrorHandler(error => {
                        throw "Error en la fila: " + error.getRow() + "\n" +
                        "Erro de Tipo: " + error.getType() + "\n" +
                        "Error en el dato: " + error.getData() + "\n" +
                        "Código de error: " + error.getErrorCode() + "\n" +
                        "Mensaje del error: " + error.getMessage();
                    });
                });
            break;
        case 'NHL':
                var rs = new Ax.rs.Reader().csv(options => {
                options.setBlob(blob);
                options.setDelimiter("|");
                options.setHeader(false);
                options.setQuoteChar(7);
                options.setCharset("ISO-8859-15");
                options.setColumnNameMapping(["pad_ruc", "pad_nomb", "file_id", "seqno"]);
                //options.getFormats().setParser("pad_fecobl", Ax.rs.DataParser.ofSQLDate("MM/dd/yyyy"));
                options.setColumnFilterMap("seqno", (src) => 0);
                options.setColumnFilterMap("file_id", (src) => mObjFilePadron.file_id);
            })
                //.cols().add("file_id", Ax.sql.Types.INTEGER, fileId => mObjFilePadron.file_id)
                //.cols().add("seqno", Ax.sql.Types.INTEGER, seqno => 0)
                .writer().db(options => {
                    options.setConnection(Ax.db.getObject());
                    options.setTableName(mObjFilePadron.file_table);
                    options.setErrorHandler(error => {
                        throw "Error en la fila: " + error.getRow() + "\n" +
                        "Erro de Tipo: " + error.getType() + "\n" +
                        "Error en el dato: " + error.getData() + "\n" +
                        "Código de error: " + error.getErrorCode() + "\n" +
                        "Mensaje del error: " + error.getMessage();
                    });
                });
            break;
        default:
            throw new Ax.ext.Exception("Origen de fichero padrón [${source}] no contemplado en carga", { source: mObjFilePadron.file_source });
    }

    Ax.db.update('pe_sunat_padron_file',
        { file_status: 'C', user_updated: Ax.db.getUser(), date_updated: new Ax.sql.Date() },
        { file_id: pIntFileId }
    );

    Ax.db.delete(mObjFilePadron.file_table, `file_id != ${pIntFileId}`);

    var mIntPrevFileID = Ax.db.executeGet(`
        <select>
            <columns>
                pe_sunat_padron_file.file_id
            </columns>
            <from table="pe_sunat_padron_file"/>
            <where>
                pe_sunat_padron_file.file_id != ? AND
                pe_sunat_padron_file.file_source = ? AND
                pe_sunat_padron_file.file_status = 'C'
            </where>
        </select>
    `, pIntFileId, mObjFilePadron.file_source);

    if (mIntPrevFileID != null) {
        Ax.db.update('pe_sunat_padron_file',
            { file_status: 'H', user_updated: Ax.db.getUser(), date_updated: new Ax.sql.Date() },
            { file_id: mIntPrevFileID }
        );
    }
}