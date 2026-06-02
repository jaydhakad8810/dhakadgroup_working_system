const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const { adminOnly, supervisorOrAdmin } = require('../middleware/auth')

// GET /api/site-materials?site_id=X
router.get('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { SiteMaterial } = require('../models')
    const { site_id, main_category } = req.query
    const where = { is_active: true }
    if (site_id) where.site_id = site_id
    if (main_category) where.main_category = main_category
    const materials = await SiteMaterial.findAll({
      where, order: [['main_category','ASC'],['product_name','ASC']]
    })
    return res.json(materials)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// GET /api/site-materials/template — download Excel template
router.get('/template', adminOnly, async (req, res) => {
  try {
    const XLSX = require('xlsx')
    const templateData = [
      {
        'Company Name': 'Asian Paints',
        'Product Name': 'Putty',
        'Shade Name': 'Fine Putty',
        'Shade Code': '001',
        'Unit': 'Kg',
        'Packaging': '40',
        'Main Category': 'Paints'
      },
      {
        'Company Name': 'Asian Paints',
        'Product Name': 'Primer',
        'Shade Name': 'SPARC Internal',
        'Shade Code': '002',
        'Unit': 'Ltr',
        'Packaging': '20',
        'Main Category': 'Paints'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    ws['!cols'] = [
      {wch:20},{wch:20},{wch:20},{wch:15},
      {wch:10},{wch:12},{wch:20}
    ]
    const notes = XLSX.utils.aoa_to_sheet([
      ['INSTRUCTIONS:'],
      ['Company Name: Required — e.g. Asian Paints, Birla White'],
      ['Product Name: Required — e.g. Putty, Primer, Paint'],
      ['Shade Name: Optional — e.g. Fine Putty, SPARC Internal'],
      ['Shade Code: Optional — e.g. 001, W102'],
      ['Unit: Required — must be exactly: Kg, Ltr, Nos, or Pcs'],
      ['Packaging: Optional — quantity per pack e.g. 40'],
      ['Main Category: Must be: Paints, Painting Kit, or Other Material'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Materials')
    XLSX.utils.book_append_sheet(wb, notes, 'Instructions')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename=material_template.xlsx')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return res.send(buffer)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/site-materials — single material creation
router.post('/', adminOnly, async (req, res) => {
  try {
    const { SiteMaterial } = require('../models')
    const { site_id, company_name, product_name, shade_name,
            shade_code, unit, packaging, main_category } = req.body
    const parts = [company_name, product_name]
    if (shade_name) parts.push(shade_name)
    if (shade_code) parts.push(shade_code)
    const full_name = parts.join(' - ')
    const material = await SiteMaterial.create({
      site_id, company_name, product_name, shade_name,
      shade_code, unit, packaging, main_category,
      full_name, created_by: req.user.id
    })
    return res.json(material)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/site-materials/import — Excel bulk import
router.post('/import', adminOnly, upload.single('file'), async (req, res) => {
  try {
    const XLSX = require('xlsx')
    const { SiteMaterial } = require('../models')
    const { site_id } = req.body
    if (!site_id) return res.status(400).json({ error: 'site_id required' })
    if (!req.file) return res.status(400).json({ error: 'File required' })

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const materialsSheetName = workbook.SheetNames.find(
      n => n.toLowerCase().includes('material')
    ) || workbook.SheetNames[workbook.SheetNames.length - 1]
    const sheet = workbook.Sheets[materialsSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet)

    const unitMap = {
      'kg': 'Kg', 'KG': 'Kg', 'Kg': 'Kg',
      'ltr': 'Ltr', 'LTR': 'Ltr', 'Ltr': 'Ltr', 'liter': 'Ltr', 'litre': 'Ltr',
      'nos': 'Nos', 'NOS': 'Nos', 'Nos': 'Nos', 'no': 'Nos',
      'pcs': 'Pcs', 'PCS': 'Pcs', 'Pcs': 'Pcs', 'piece': 'Pcs',
    }
    const categoryMap = {
      'paints': 'Paints', 'paint': 'Paints',
      'painting kit': 'Painting Kit', 'kit': 'Painting Kit',
      'other material': 'Other Material', 'other': 'Other Material',
    }

    const results = { imported: 0, errors: [] }
    for (const [i, row] of rows.entries()) {
      try {
        const company_name = (row['Company Name'] || row['company_name'] || row['COMPANY NAME'] || '').toString().trim()
        const product_name = (row['Product Name'] || row['product_name'] || row['PRODUCT NAME'] || '').toString().trim()
        const shade_name = (row['Shade Name'] || row['shade_name'] || row['SHADE NAME'] || '').toString().trim() || null
        const shade_code = (row['Shade Code'] || row['shade_code'] || row['SHADE CODE'] || '').toString().trim() || null
        const unit_raw = (row['Unit'] || row['unit'] || row['UNIT'] || '').toString().trim()
        const packaging = (row['Packaging'] || row['packaging'] || row['PACKAGING'] || '').toString().trim() || null
        const main_category_raw = (row['Main Category'] || row['main_category'] || row['MAIN CATEGORY'] || '').toString().trim()

        const unit = unitMap[unit_raw] || unit_raw
        const main_category = categoryMap[main_category_raw.toLowerCase()] || categoryMap[main_category_raw] || 'Other Material'

        if (!company_name || !product_name || !unit) {
          results.errors.push({ row: i+2, error: 'Missing Company Name, Product Name or Unit' })
          continue
        }
        const parts = [company_name, product_name]
        if (shade_name) parts.push(shade_name)
        if (shade_code) parts.push(shade_code)
        const full_name = parts.join(' - ')

        await SiteMaterial.create({
          site_id, company_name, product_name, shade_name,
          shade_code, unit, packaging, main_category,
          full_name, created_by: req.user.id
        })
        results.imported++
      } catch (err) {
        results.errors.push({ row: i+2, error: err.message })
      }
    }
    return res.json(results)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// DELETE /api/site-materials/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { SiteMaterial } = require('../models')
    await SiteMaterial.update(
      { is_active: false },
      { where: { id: req.params.id } }
    )
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

module.exports = router
