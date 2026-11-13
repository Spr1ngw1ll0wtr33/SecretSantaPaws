"""Makes Secret-Santa-Paws-template.xlsx, the blank participants spreadsheet.

Run from the repository folder:   python3 tools/make-template.py
Re-run it after adding a country to matching.js, so the drop-down list matches the app.
"""
import json
import subprocess

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

# The country list and groups, straight from the app
data = json.loads(subprocess.check_output(
    ['node', '-e', "const M=require('./matching.js');"
     "console.log(JSON.stringify({c:M.COUNTRIES,g:M.GROUPS,f:M.FIELDS}))"]))
COUNTRIES, GROUPS, FIELDS = data['c'], data['g'], data['f']
HEADINGS = [FIELDS[k] for k in ['ig', 'dog', 'address', 'country', 'sendTo', 'email']]

RED, GREEN, CREAM = 'B3312B', '2E6B3C', 'FBF5E8'
bold_white = Font(bold=True, color='FFFFFF', size=12)
bold = Font(bold=True)
title_font = Font(bold=True, size=16, color=RED)
head_fill = PatternFill('solid', fgColor=GREEN)
note_fill = PatternFill('solid', fgColor=CREAM)
thin = Side(style='thin', color='999999')
box = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical='top')

wb = Workbook()

# ---- Tab 1: Participants (the app reads only the first tab) ----
ws = wb.active
ws.title = 'Participants'
ws.append(HEADINGS)
for cell in ws[1]:
    cell.font = bold_white
    cell.fill = head_fill
    cell.border = box
    cell.alignment = Alignment(vertical='center')
ws.row_dimensions[1].height = 24
for col, width in zip('ABCDEF', [22, 20, 60, 26, 26, 32]):
    ws.column_dimensions[col].width = width
ws.freeze_panes = 'A2'

names = [c['name'] for c in COUNTRIES]
joined = ','.join(names)
# Spreadsheet programs only allow 255 characters in a drop-down written this way
assert len(joined) <= 255, 'Too many countries for the drop-down list; switch it to a range on the Countries tab'
country_list = DataValidation(type='list', formula1='"' + joined + '"', allow_blank=True)
country_list.promptTitle = 'Country of Residence'
country_list.prompt = 'Pick the country where the dog lives.'
country_list.errorTitle = 'Not on the list'
country_list.error = ('This country is not in the app yet. Choose one from the list, '
                      'or ask for the country to be added to matching.js.')
country_list.showInputMessage = True
country_list.showErrorMessage = True
ws.add_data_validation(country_list)
country_list.add('D2:D1000')

send_hint = DataValidation(type='none', allow_blank=True)  # a hint only, any text is accepted
send_hint.promptTitle = 'Will Send To'
send_hint.prompt = ('Any, a country, EU, Europe, or a list such as "UK & Europe" or "Canada & USA". '
                    'Every row for one account must say the same.')
send_hint.showInputMessage = True
ws.add_data_validation(send_hint)
send_hint.add('E2:E1000')

# ---- Tab 2: How to fill this in ----
g = wb.create_sheet('How to fill this in')
g.column_dimensions['A'].width = 26
g.column_dimensions['B'].width = 95
g['A1'] = 'Secret Santa Paws: how to fill in the spreadsheet'
g['A1'].font = title_font
rows = [
    ('The golden rule', 'Fill in the "Participants" tab only, and keep it as the FIRST tab. The app reads only the first tab of the file.'),
    ('One row per entry', 'One row for each entry in the draw. An account entering two dogs separately has two rows: the same IG Account on both, with one dog\'s name on each.'),
    ('IG Account', 'The Instagram account name, e.g. bertiesflops. It is shown to the person who will send them a gift.'),
    ("Dog's Name", 'The dog\'s name. Several dogs sharing one entry can go in one cell, e.g. "Bella & Max". The emails start "Dear <this name>".'),
    ('Address', 'The full postal address, including the person\'s name, postcode and country. It is sent to their Secret Santa exactly as written.'),
    ('Country of Residence', 'Where the dog lives. Choose from the drop-down list (see the "Countries and choices" tab).'),
    ('Will Send To', 'Where they are happy to post a gift: "Any", a country, "EU", "Europe", or a list such as "UK & Europe" or "Canada & USA". Separate countries with & or a comma, not just a space. It only controls who they SEND to, never who sends to them.'),
    ('Email Address', 'Where their match details are emailed.'),
    ('Same account, same choices', 'Every row for one IG Account must have the same Country of Residence and Will Send To. The app refuses to run if they differ.'),
    ('When it is ready', 'Download or save the file as an Excel (.xlsx) file, then choose it in step 1 of the app. If something needs fixing, the app names the row.'),
    ('Privacy', 'The app reads this file on your own computer and uploads nothing. Never put a real participants list on GitHub or anywhere public.'),
]
r = 3
for label, text in rows:
    g.cell(r, 1, label).font = bold
    g.cell(r, 1).alignment = wrap
    g.cell(r, 2, text).alignment = wrap
    r += 1
r += 1
g.cell(r, 1, 'Example rows').font = Font(bold=True, size=13, color=GREEN)
g.cell(r, 2, 'Made-up examples only. Do not copy these into the Participants tab.').font = Font(italic=True)
r += 1
ex_head = r
examples = [
    HEADINGS,
    ['bertiesflops', 'Bertie', 'A. Flopsman, 1 High Street, Hightown, AB1 2CD, United Kingdom', 'United Kingdom', 'UK & Europe', 'bertie@example.com'],
    ['westiedog', 'Isla', 'J. Smith, 12 Maple Road, Toronto, ON M1A 1A1, Canada', 'Canada', 'Canada & USA', 'westie@example.com'],
    ['westiedog', 'Pip', 'J. Smith, 12 Maple Road, Toronto, ON M1A 1A1, Canada', 'Canada', 'Canada & USA', 'westie@example.com'],
    ['bellaandmax', 'Bella & Max', 'K. Berg, Storgatan 3, 111 22 Stockholm, Sweden', 'Sweden', 'Any', 'bella@example.com'],
]
for i, row in enumerate(examples):
    for j, value in enumerate(row):
        c = g.cell(r, 1 + j, value)
        c.border = box
        c.alignment = wrap
        if i == 0:
            c.font = bold_white
            c.fill = head_fill
        else:
            c.fill = note_fill
    r += 1
for col, width in zip('CDEF', [50, 22, 18, 24]):
    g.column_dimensions[col].width = width
g.cell(r, 1, 'Note').font = bold
g.cell(r, 2, 'westiedog is one account entering two dogs: two rows, same account, same country, same Will Send To. '
             'The app never matches Isla and Pip with each other.').alignment = wrap

# ---- Tab 3: Countries and choices ----
c = wb.create_sheet('Countries and choices')
c.column_dimensions['A'].width = 30
c.column_dimensions['B'].width = 80
c['A1'] = 'Countries the app understands'
c['A1'].font = title_font
c.append([])
c.append(['Country (use in either column)', 'Other spellings also accepted'])
for cell in c[3]:
    cell.font = bold_white
    cell.fill = head_fill
for country in COUNTRIES:
    c.append([country['name'], ', '.join(country['also']) or '-'])
c.append([])
c.append(['Will Send To can also say', 'Meaning'])
for cell in c[c.max_row]:
    cell.font = bold_white
    cell.fill = head_fill
c.append(['Any', 'Happy to send anywhere in the world (also: anywhere, all, worldwide).'])
for grp in GROUPS:
    also = (' (also: ' + ', '.join(grp['also']) + ')') if grp['also'] else ''
    c.append([grp['name'], 'Any of: ' + ', '.join(grp['members']) + also])
c.append(['UK & Europe', 'A list: separate the parts with & or a comma. The United Kingdom is NOT in "EU" or "Europe", so add it like this.'])
c.append([])
c.append(['Capital letters, full stops and a leading "The" do not matter.'])
c.append(['A country that is not listed here must be added to matching.js before the draw (one line).'])
for row in c.iter_rows(min_row=4):
    for cell in row:
        cell.alignment = wrap

wb.save('Secret-Santa-Paws-template.xlsx')
print('Saved Secret-Santa-Paws-template.xlsx with', len(names), 'countries')
