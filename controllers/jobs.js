const async = require('async');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const Job = require('../models/job');

var Jobs = {};

var queue = async.queue(function (job, callback) {


    console.log('queue are now', queue.length(), 'waiting in the queue');

    job.queued = false;
    job.running = true;

    job.save();

    var command = `${path.resolve(config.cheripic)}`;

    if (job.data.input_format) {
        command += ` --input-format ${job.data.input_format}`;
    }
    if (job.data.hmes_adjust) {
        command += ` --hmes-adjust ${job.data.hmes_adjust}`;
    }
    if (job.data.ht_low) {
        command += ` --htlow ${job.data.ht_low}`;
    }
    if (job.data.ht_high) {
        command += ` --hthigh ${job.data.ht_high}`;
    }
    if (job.data.min_depth) {
        command += ` --mindepth ${job.data.min_depth}`;
    }
    if (job.data.max_d_multiple) {
        command += ` --max-d-multiple ${job.data.max_d_multiple}`;
    }
    if (job.data.max_depth) {
        command += ` --maxdepth ${job.data.max_depth}`;
    }
    if (job.data.min_non_ref_count) {
        command += ` --min-non-ref-count ${job.data.min_non_ref_count}`;
    }
    if (job.data.min_indel_count_support) {
        command += ` --min-indel-count-support ${job.data.min_indel_count_support}`;
    }
    if (job.data.mapping_quality) {
        command += ` --mapping-quality ${job.data.mapping_quality}`;
    }
    if (job.data.base_quality) {
        command += ` --base-quality ${job.data.base_quality}`;
    }
    if (job.data.noise) {
        command += ` --noise ${job.data.noise}`;
    }
    if (job.data.cross_type) {
        command += ` --cross-type ${job.data.cross_type}`;
    }
    if (job.data.bfr_adjust) {
        command += ` --bfr-adjust ${job.data.bfr_adjust}`;
    }
    if (job.data.sel_seq_len) {
        command += ` --sel-seq-len ${job.data.sel_seq_len}`;
    }
    if (job.files.assembly) {
        command += ` -f ${path.resolve(job.files.assembly.path)}`;
    }
    if (job.files.mut_bulk) {
        command += ` --mut-bulk ${path.resolve(job.files.mut_bulk.path)}`;
    }
    if (job.files.bg_bulk) {
        command += ` --bg-bulk ${path.resolve(job.files.bg_bulk.path)}`;
    }
    if (job.files.mut_bulk_vcf) {
        command += ` --mut-bulk-vcf ${path.resolve(job.files.mut_bulk_vcf.path)}`;
    }
    if (job.files.bg_bulk_vcf) {
        command += ` --bg-bulk-vcf ${path.resolve(job.files.bg_bulk_vcf.path)}`;
    }
    if (job.files.mut_parent) {
        command += ` --mut-parent ${path.resolve(job.files.mut_parent.path)}`;
    }
    if (job.files.bg_parent) {
        command += ` --bg-parent ${path.resolve(job.files.bg_parent.path)}`;
    }
    if (job.files.repeats_file) {
        command += ` --repeats-file ${path.resolve(job.files.repeats_file.path)}`;
    }

    var exec = require("child_process").exec;
    var dir = path.resolve(`tmp/${job.id}`);
    fs.mkdir(dir, function (err) {
        if (err) {
            job.errored = true;
            job.error = err;
            job.save();
            return callback(err);
        }
        exec(command, {
            cwd: dir
        }, function (err, stdout, stderr) {

            job.queued = false;
            job.running = false;
            job.complete = true;

            //TODO tell the job the err, stdout, stderr

            if (err) {
                job.errored = true;
                job.error = JSON.stringify({err, stderr});
                job.save();
                return callback(err)
            }

            job.outputPath = `${dir}/${config.outputFilename}`;
            job.save();

            return callback();
        });
    });


}, 1);


Jobs.submit = (req, res, next)=> {

    var data = req.body;
    var files = req.files;

    var j = new Job({
        data,
        files
    });

    j.save()
        .then((savedJob)=> {

            queue.push([savedJob], function (err) {
            });
            return res.redirect(`/job/${savedJob.id}`);
        })
        .catch((err)=> {
            return res.render('error', {error: err})
        })
};

Jobs.show = (req, res, next)=> {

    var id = req.params.id;

    Job.get(id)
        .then((job)=> {
            return res.render('show', {job})
        })
        .catch((err)=> {
            return res.render('error', {error: err});
        });


};

Jobs.download = (req, res, next)=> {
    var id = req.params.id;
    Job.get(id)
        .then((job)=> {
            return res.download(job.outputPath);
        })
        .catch((err)=> {
            return res.render('error', {error: err});
        });
};

module.exports = Jobs;