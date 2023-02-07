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
 *  Version     : v1.2
 *  Date        : 06-02-2023
 *  Description : Procesa fichero en excel y actualiza el código digemid de los artículos en garticul_ext.
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: sstdd_digemid              A través de la acción 'ACTION_BTN_1'
 *
 *  PARAMETERS:
 *  ==================
 *      @param  {integer}   p_fileid      Número serial del registro de la tabla sstd_digemid
 *
 **/

 function crp_load_digemid_file(p_fileid) {
    let mBoolValidFormat = false;
    let m_count_update = 0;
    var mStrUserName = Ax.db.getUser();
    var msg_fbck = '';

    let m_blob = Ax.db.executeQuery(`
        SELECT file_status, file_data, file_type, user_updated
          FROM sstd_digemid
         WHERE file_seqno = ?
    `, p_fileid).toOne();

    const m_mimetype_excel = [
        'application/vnd.ms-excel',
        'application/msexcel',
        'application/x-msexcel',
        'application/x-ms-excel',
        'application/x-excel',
        'application/x-dos_ms_excel',
        'application/xls',
        'application/x-xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    // Restringe un formato de fichero valido
    mBoolValidFormat = m_mimetype_excel.includes(m_blob.file_type);

    if (mBoolValidFormat) {
        if (m_blob.file_status == 'P') {
            try {
                const wb = Ax.ms.Excel.load(m_blob.file_data);
                const sheet = wb.getSheet(0);
                sheet.removeRow(0);

                for (let row of sheet) {
                    let m_arr = row.toArray();

                    // if (m_arr[0] && (m_arr[1] + '').length() == 5) {
                    if (m_arr[0] && String(m_arr[1]).length == 5) {

                        try {

                            var res = Ax.db.update('garticul_ext', {
                                code_digemid: m_arr[1],
                                user_updated: m_blob.user_updated,
                                date_updated: new Ax.util.Date()
                            }, { codigo: m_arr[0] });

                            // Si se realiza el update
                            if (res.count !== 0) {

                                let mIntDigemidId = Ax.db.executeGet(`
                                    <select>
                                        <columns>
                                            digemid_id
                                        </columns>
                                        <from table='crp_sstd_digemid'/>
                                        <where>
                                            codart = ?
                                            AND file_seqno = ?
                                        </where>
                                    </select> 
                                `, m_arr[0], p_fileid);

                                if (mIntDigemidId) {    // Si existe un codigo flexline
                                    /*
                                    * Update de (flexline y digemid) que se pudieron actualizar en garticul_ext
                                    */
                                    Ax.db.update('crp_sstd_digemid', {
                                        codart: m_arr[0],
                                        code_digemid: m_arr[1],
                                        file_seqno: p_fileid,
                                        user_updated:  mStrUserName
                                    }, {digemid_id: mIntDigemidId});

                                } else {    // Si no existe un codigo flexline
                                    /*
                                    * Insert de los datos (flexline y digemid) que se pudieron actualizar en garticul_ext
                                    */
                                    Ax.db.insert('crp_sstd_digemid', {
                                        codart: m_arr[0],
                                        code_digemid: m_arr[1],
                                        file_seqno: p_fileid,
                                        user_created: mStrUserName,
                                        user_updated: mStrUserName
                                    });
                                }

                                m_count_update++;
                            } else {
                                msg_fbck = msg_fbck + '[' + m_arr[0] + ', ' + m_arr[1] + ']' + '\n';
                            }

                        } catch (e) {
                            console.error(e);
                            throw new Ax.ext.Exception("Error-1: [${error}].",{error : e});
                        }
                    } else {
                        msg_fbck = msg_fbck + '[' + m_arr[0] + ', ' + m_arr[1] + ']' + '\n';
                    }
                }
            } catch (e) {
                throw new Ax.ext.Exception("Error-2: [${error}].",{error : e});
                // throw new Ax.ext.Exception('', `Error al procesar el fichero Excel`);
            }
        } else {
            throw new Ax.ext.Exception('', `Solo permite la carga de ficheros en estado Pendiente`);
        }
    } else {
        throw new Ax.ext.Exception('', `Este tipo de fichero no se puede cargar: '${m_blob.file_type}'`);
    }

    if (m_count_update > 0) {
        if (msg_fbck) {
            msg_fbck = 'El código de artículo no existe y/o el código Digemid no cumple el formato necesario: \n' + msg_fbck;
        }
        Ax.db.update('sstd_digemid', { file_status: 'H' }, { file_status: 'C' });
        Ax.db.update('sstd_digemid', { file_status: 'C', file_memo: msg_fbck }, { file_seqno: p_fileid });

        return m_count_update;
    } else {
        throw new Ax.ext.Exception('', `No se pudo actualizar el estado del fichero anterior.`);
    }
}
