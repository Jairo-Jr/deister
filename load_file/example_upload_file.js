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
 *  JS: pe_sunat_padron_load_source_xls
 *      Version:    V1.0
 *      Date:       2022.02.04                                           
 *      Description: Load Excel file "Entidades exceptuadas de percepción del IGV"  
 *                   or "Contribuyentes no aplica detracción intendencia Lima"
 * 
 * 
 */
 function pe_sunat_padron_load_source_xls(pIntFile) {

    // Get fields and excel file 
    var mSunatPadron = Ax.db.executeQuery(`
        <select>
            <columns>
                pe_sunat_padron_file.file_id,
                pe_sunat_padron_file.file_source,
                pe_sunat_padron_file.file_status,
                CASE WHEN pe_sunat_padron_file.file_source = 'EEP' THEN 'pe_sunat_padron_excepcion_percep'
                     WHEN pe_sunat_padron_file.file_source = 'CNA' THEN 'pe_sunat_padron_no_detraccion'
                     ELSE ''
                 END <alias name='table_load' />,
                pe_sunat_padron_file.file_data,
                pe_sunat_padron_file.file_status
            </columns>
            <from table='pe_sunat_padron_file'/>
            <where>
                pe_sunat_padron_file.file_id = ?
            </where>
        </select>
    `, pIntFile).toOne();
    
    var mPrevSunatPadron = Ax.db.executeQuery(`
        <select>
            <columns>
                pe_sunat_padron_file.file_id
            </columns>
            <from table='pe_sunat_padron_file'/>
            <where>
                pe_sunat_padron_file.file_id    != ?   AND
                pe_sunat_padron_file.file_source = ?   AND
                pe_sunat_padron_file.file_status = 'C'
            </where>
        </select>
    `, pIntFile, mSunatPadron.file_source).toOne();

    if (mSunatPadron.file_id == null){
        throw new Ax.ext.Exception("No encontrado el fichero con Id. [${fileId}] en maestro de padrones.",{ fileId : pIntFile});
    } 

    if (mSunatPadron.file_status != "P"){
        throw new Ax.ext.Exception("El fichero con Id. [${fileId}] ya ha sido cargado.",{ fileId : pIntFile});
    }    
    
    // Verify format file is Excel
    try{
        var wb = Ax.ms.Excel.load(mSunatPadron.file_data);
    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de excel")
    }

    // Evaluate formules Excel
    wb.evaluate();

    // Load excel file from blob
    var mSheet = wb.getSheet(0);

    // Diference variables for file source EEP or file source CNA
    if (mSunatPadron.file_source == 'EEP'){
        var m_startRowHeader = 4;

        // Array with name columns to insert
        excelTabCols    = ['num','pad_ruc','pad_nomb','pad_tterce'];        
    } else {
        var m_startRowHeader = 2;

        // Array with name columns to insert
        excelTabCols    = ['ord','pad_ruc','pad_nomb'];  
    }    

    // Control exist rows with data
    var nLastRow = mSheet.getLastRowNum();
    if (nLastRow < m_startRowHeader){
        throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel"); 
    }
    
    let mainTableData = {};

    // Iterate rows Excel with data to insert
    for (let r = m_startRowHeader; r <= nLastRow; r++) {
        
        let row = mSheet.getRow(r);

        // Iterate cells of the row
        for (var cell  of row) {
            // The first column not insert 
            if (cell.getColumnIndex() == 0) continue;
            
            // All values for this table are converted to string
            if (cell.getValue() != null) {
               // Is possible found character unicode in text, replace by correct value
               mainTableData[excelTabCols[cell.getColumnIndex()]] = cell.getValue().replace("", "ÑA").replace("", "ÑI").replace("", "ño").toString();
            }  
        }

        // Add the column "file_id" for insert table
        mainTableData['file_id'] = pIntFile;

        // Insert values into table
        let inserted = Ax.db.insert(mSunatPadron.table_load,mainTableData).getCount();
    }

    // Update status file to "[C]argado" with control date
    var user_updated = Ax.db.getUser();
    var date_updated = new Ax.sql.Date();
    Ax.db.update("pe_sunat_padron_file",{"file_status" : "C", "user_updated" : user_updated, "date_updated" : date_updated},{"file_id" : pIntFile});

    // Delete records after of load data file
    Ax.db.delete(mSunatPadron.table_load,`
        file_id != ${pIntFile}`); 
        
    /*
    * Solo permitirá un fichero cargado, el fichero cargado anterior pasará a histórico
    */
    
    if (mPrevSunatPadron.file_id != null) {
        Ax.db.update("pe_sunat_padron_file",{"file_status" : "H", "user_updated" : user_updated, "date_updated" : date_updated},{"file_id" : mPrevSunatPadron.file_id});
    }
}
