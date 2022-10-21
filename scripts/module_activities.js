"using strict";

class FVSignupModuleActivities {
  static element;

  static init(element, callback) {
    this.element = jQuery('<div id="activities_module"></div>');
    this.element.append('<p>Loading activities module</p>');
    element.append(this.element);

    this.page_id = element.attr('id');

    jQuery.getJSON({
      url: fv_signup_settings.infosys_url+"/api/signup/activities",
      success: function (activities_info) {
        // console.log("Activity Module: get activities\n", activities_info);
        FVSignupModuleActivities.render_activities(activities_info);
      }
    }).fail(function () {
      FVSignup.com_error();
    }).always(function (){
      callback();
    });
  }

  static render_activities(activities_info) {
    let lang = fv_signup_settings.lang;

    this.element.empty();
    let content_wrapper = jQuery('<div id="activities-content"></div>');
    this.element.append(content_wrapper);

    // Filter
    let filter = this.render_filter(activities_info.categories);
    content_wrapper.append(filter);

    // Day selection
    let day_header = jQuery('<div id="activity-day-selection"></div>');
    content_wrapper.append(day_header);

    // Error for no day attending
    let text = {
      en: 'You have not selected any day to attend Fastaval',
      da: 'Du har ikke valgt hvilke dage du er på Fastaval'
    }
    this.day_error = jQuery('<div id="activity-day-error"></div>');
    this.day_error.text(text[lang]);
    content_wrapper.append(this.day_error);

    // Activity table wrapper
    let activity_content = jQuery('<div id="activity-tables-wrapper"></div>');
    content_wrapper.append(activity_content);

    // Time header for each table
    let time_header = this.render_time_header(activities_info.table_headline[lang]);

    // Sectioning row
    let gray_width = 4;
    let section_row = jQuery('<tr class="sectioning-row activity-row"></tr>') ;
    let parity = 'odd';
    for(let i = 0; i*gray_width <= 36; i++) {
      section_row.append('<td class="'+parity+'" colspan="'+gray_width+'"></td>');
      parity = parity == 'odd' ? 'even' : 'odd';
    }

    for(const day in activities_info.runs){
      // Day button
      let day_text = FVSignup.get_weekday(day);
      day_text = FVSignup.uc_first(day_text);
      day_header.append('<div id="day-button-'+day+'" class="day-button" weekday="'+day+'">'+day_text+'</div>');

      // Activities table
      let table = jQuery('<table id="activities-day-'+day+'" activity-day="'+day+'"></table>');
      activity_content.append(table);
      let table_body = jQuery('<tbody></tbody>');
      table.append(table_body);

      // Time header
      table_body.append(time_header.prop('outerHTML'));

      for (const run of activities_info.runs[day]) {
        // normalize times within time table
        if(run.start.hour < activities_info.day_cutoff) run.start.hour += 24;
        if(run.end.hour < activities_info.day_cutoff) run.end.hour += 24;

        // Activity row
        let activity = activities_info.activities[run.activity];
        let category = activities_info.categories[activity.type] ? activity.type : 'default';
        let row_middle = jQuery('<tr class="activity-row"></tr>');
        row_middle.addClass(activity.type).addClass(category).attr('activity-id', run.activity);
        
        //Sectioning rows
        let row_before = section_row.clone().addClass('before')
        row_before.addClass(activity.type).addClass(category).attr('activity-id', run.activity);
        let row_after = section_row.clone().addClass('after')
        row_after.addClass(activity.type).addClass(category).attr('activity-id', run.activity);

        // Flag & Title cell
        let flag = this.get_flag(activity.lang);
        let title = activity.title[lang] ? activity.title[lang] : activity.title.da;
        row_before.prepend('<td class="activity-title" rowspan="3">'+flag+'<div class="title-wrapper">'+title+'</div></td>');
        
        // calculate cell positions
        let start = (run.start.hour -8)*2;
        start += Math.round(run.start.min/30);
        let end = (run.end.hour -8)*2;
        end += Math.round(run.end.min/30);
        
        // Spacing cells before
        if (start > 0) {
          let parity = 'odd';
          for(let i = 0; i*gray_width < start; i++) {
            row_middle.append('<td class="'+parity+'" colspan="'+Math.min(gray_width, start-i*gray_width)+'"></td>');
            parity = parity == 'odd' ? 'even' : 'odd';
          }
        }
        
        // Selection cell
        let select_cell = jQuery('<td class="activity-cell" colspan="'+(end-start)+'"></td>');
        row_middle.append(select_cell);

        // Select input
        let choice = this.render_choice(activity, run, category);
        let color = activities_info.categories[category].color;
        choice.css('background-color', color);
        select_cell.append(choice);

        // Spacing cells after (for coloring purpose)
        if (end < 36) {
          let gray_end = Math.floor(end / gray_width) + 1;
          let parity = (gray_end) % 2 ? 'odd' : 'even';
          for(let i = gray_end; i*gray_width <= 36; i++) {
            row_middle.append('<td class="'+parity+'" colspan="'+Math.min(gray_width, i*gray_width-end)+'"></td>');
            parity = parity == 'odd' ? 'even' : 'odd';
          }
        }

        table_body.append(row_before);
        table_body.append(row_middle);
        table_body.append(row_after);

        // Description row
        let desc_row = jQuery('<tr class="description-row"></tr>');
        let desc_cell = jQuery('<td colspan="60" class="description-cell"></td>');
        desc_cell.append('<p>'+activity.desc[lang]+'</p>');
        if (activity.wp_id != 0) {
          desc_cell.append('<a href="/index.php?p='+activity.wp_id+'&lang='+lang+'" target="_blank">'+activities_info.link_text[lang]+'</a>');
        }
        desc_row.hide();
        desc_row.append(desc_cell);

        table_body.append(desc_row);
      }
    }
    FVSignupLogicActivities.init(activities_info);
  }

  static render_filter(categories) {
    let filter = jQuery('<div class="filter"></div>');
    let lang = fv_signup_settings.lang;

    for(const [id, cat] of Object.entries(categories)) {
      if (cat.nobutton) continue;

      let category = id;
      if (cat.include) category += " " + cat.include.join(" ");

      let filter_button = jQuery('<div class="filter-button '+category+'"></div>');
      filter_button.attr('filter-category', category)
      filter_button.text(cat[lang]);
      if(id == 'all') filter_button.addClass('selected');
      filter.append(filter_button);
    }

    return filter;
  }

  static render_time_header(headline) {
    let row = jQuery('<tr class="header-row"></tr>');
    let activities = jQuery('<td class="table-header">'+headline+'</td>');
    row.append(activities);

    for(let i = 8; i < 27; i++) {
      let time = (i % 24)
      row.append('<td colspan="2" class="time-section"><div class="time"><span class="time-label">'+time+'</span></div></td>');
    }

    return row;
  }

  static render_choice(activity, run) {
    let choice = jQuery('<div class="input-wrapper activity-choice '+activity.type+'"></div>');
    choice.attr('activity-type', activity.type);
    choice.attr('activity-gm', activity.gm);
    choice.attr('run-start', run.start.stamp);
    choice.attr('run-end', run.end.stamp);
    choice.append('<input type="hidden" id="activity:'+run.id+'" value="0">');
    choice.append('<div class="choice-text"></div>');
    return choice;
  }

  static get_flag(lang) {
    let file_name;
    switch (true) {
      case lang.en && lang.da:
        file_name = "flag-dansk+engelsk.jpg";
        break;

      case lang.en:
        file_name = "flag-engelsk.jpg";
        break;

      case lang.da:
        file_name = "flag-dansk.jpg";
        break;
    
      default:
        return "";
    }

    let root = fv_signup_settings.plugin_root;
    return '<div class="flag-wrapper" style="width:24px; height:16px"><img src="'+root+'/flags/'+file_name+'"></div>';
  }
}