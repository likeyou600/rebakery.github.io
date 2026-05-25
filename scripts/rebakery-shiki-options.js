'use strict';

const LINE_NUMBER_MARKER = '__rebakery_line_numbers__';

hexo.extend.filter.register('before_post_render', data => {
  data.content = data.content
    .replace(/^([`~]{3,})([^\r\n]*\bline_number:true\b[^\r\n]*)$/gm, (match, fence, rawInfo) => {
      const info = rawInfo
        .replace(/\s*\bline_number:true\b\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `${fence}${info ? ` ${info}` : ''} ${LINE_NUMBER_MARKER}`;
    })
    .replace(/{%\s*codeblock\b([^%]*?)\s+line_number:true([^%]*?)%}/g, (match, before, after) => {
      const args = `${before} ${after} ${LINE_NUMBER_MARKER}`
        .replace(/\s+/g, ' ')
        .trim();
      return `{% codeblock ${args} %}`;
    });

  return data;
});

hexo.extend.filter.register('after_post_render', data => {
  data.content = data.content.replace(/<figure class="shiki([^"]*)"([\s\S]*?)<\/figure>/g, match => {
    if (!match.includes(LINE_NUMBER_MARKER)) {
      return match;
    }

    return match
      .replace('<figure class="shiki', '<figure class="shiki rebakery-line-numbers')
      .replaceAll(LINE_NUMBER_MARKER, '')
      .replace(/\s+<\/div>/g, '</div>')
      .replace(/data_title="\s+/g, 'data_title="')
      .replace(/\s+"/g, '"');
  });

  return data;
});
